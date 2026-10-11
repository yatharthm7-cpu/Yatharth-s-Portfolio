"use strict";
// Simulates the routing order Vercel documents (redirects, then headers, then
// rewrites, then the filesystem / functions) against the project's vercel.json,
// so the redirect chain and the internal-file blocks can be reasoned about
// exactly before a deployment makes them testable on the real runtime.
//
// This models Vercel's path matching: a source without a wildcard matches the
// exact path (verified against the live site, where "/admin/:path*" does not
// match the bare "/admin/"), while ":path*" matches one or more segments.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

const PLACEHOLDER = "\u0000";

function compile(source) {
  const keys = [];
  const tokenised = source.replace(/\/:path\*/g, () => { keys.push("path*"); return PLACEHOLDER; });
  const escaped = tokenised.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped
    .replace(/\u0000/g, "()") // resolved below, after escaping
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_m, name) => { keys.push(name); return "([^/]+)"; })
    .replace(/\(\)/g, "(?:/(.+))?");
  return { regex: new RegExp("^" + pattern + "$"), keys };
}

function substitute(destination, captured) {
  return destination
    .replace(/:path\*/g, captured["path*"] || "")
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_m, name) => captured[name] || "");
}

const redirects = config.redirects.map((rule) => ({ ...rule, compiled: compile(rule.source) }));
const rewrites = config.rewrites.map((rule) => ({ ...rule, compiled: compile(rule.source) }));

function matchHost(rule, host) {
  for (const condition of rule.has || []) {
    if (condition.type === "host" && condition.value !== host) return false;
  }
  return true;
}

function localFileExists(requestPath) {
  const relative = requestPath.replace(/^\//, "");
  if (!relative) return fs.existsSync(path.join(root, "index.html"));
  const candidate = path.join(root, relative);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return true;
  return fs.existsSync(path.join(root, relative, "index.html"));
}

// .vercelignore names files that must never reach the deployment. The simulator
// has to honour it, otherwise an excluded file reads as servable just because it
// happens to sit in the working tree.
const ignorePatterns = fs.readFileSync(path.join(root, ".vercelignore"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

function isIgnored(requestPath) {
  for (const pattern of ignorePatterns) {
    const dir = pattern.replace(/\/$/, "");
    if (pattern.includes("/")) {
      // A slash anchors the pattern to the repository root.
      if (requestPath === "/" + dir || requestPath.startsWith("/" + dir + "/")) return true;
    } else {
      // Unanchored: matches this directory at any depth.
      if (requestPath.split("/").includes(dir)) return true;
    }
  }
  return false;
}

// One resolution pass. Returns either a redirect (status + location) or a
// filesystem/function lookup at the rewritten path.
function resolve(requestPath, host) {
  for (const rule of redirects) {
    if (!matchHost(rule, host)) continue;
    const match = rule.compiled.regex.exec(requestPath);
    if (match) {
      const captured = {};
      rule.compiled.keys.forEach((key, index) => { captured[key] = match[index + 1]; });
      return { kind: "redirect", status: rule.permanent ? 301 : 302, location: substitute(rule.destination, captured) };
    }
  }
  for (const rule of rewrites) {
    const match = rule.compiled.regex.exec(requestPath);
    if (match) {
      const captured = {};
      rule.compiled.keys.forEach((key, index) => { captured[key] = match[index + 1]; });
      return { kind: "rewrite", target: substitute(rule.destination, captured) };
    }
  }
  return { kind: "static", target: requestPath };
}

// Follows redirects the way a client would, tracking host changes when a
// redirect targets an absolute URL.
function follow(startPath, startHost) {
  let current = startPath, host = startHost, hops = 0;
  const chain = [startHost + startPath];
  while (hops++ < 6) {
    const outcome = resolve(current, host);
    if (outcome.kind === "redirect") {
      let location = outcome.location;
      if (/^https?:\/\//.test(location)) {
        const parsed = new URL(location);
        host = parsed.host;
        location = parsed.pathname;
      }
      chain.push("--" + outcome.status + "--> " + host + location);
      current = location;
      continue;
    }
    const target = outcome.target;
    if (/^\/api\//.test(target)) return { chain, final: target, status: "function" };
    if (isIgnored(target)) {
      // Excluded from the deployment, so the runtime serves its 404 even though
      // the file is present locally.
      return { chain, final: target, status: 404 };
    }
    const exists = localFileExists(target);
    if (!exists && !/^\/_internal\//.test(target)) {
      // A rewrite to /_internal/* is the deliberate block: the destination does
      // not exist, so the deployment answers 404.
      return { chain, final: target, status: exists ? 200 : 404 };
    }
    return { chain, final: target, status: exists ? 200 : 404 };
  }
  return { chain, final: current, status: "redirect-loop" };
}

const apex = "scaleupbiz.co.in";
// [request, host, expectedFirstStatus, expectedFinalStatus, description]
const cases = [
  ["/", apex, 200, 200, "homepage serves directly"],
  ["/index.html", apex, 301, 200, "index.html permanently redirects to the root"],
  ["/website-development/", apex, 200, 200, "canonical service page serves"],
  ["/website-development", apex, 301, 200, "bare service URL redirects to the canonical one"],
  ["/privacy.html", apex, 200, 200, "privacy page serves"],
  ["/styles.css", apex, 200, 200, "shared stylesheet serves"],
  ["/branding/scaleupbiz-mark.png", apex, 200, 200, "logo asset serves"],
  ["/branding/scaleupbiz-social-preview.png", apex, 200, 200, "social preview image serves"],
  ["/website-development/service.css", apex, 200, 200, "service page stylesheet serves"],
  ["/admin", apex, 200, 200, "admin loads through its rewrite"],
  ["/admin/", apex, 200, 200, "admin trailing-slash loads through its rewrite"],
  ["/admin/admin.js", apex, 200, 200, "admin script serves"],
  ["/api/reviews", apex, "function", "function", "reviews endpoint reaches a server function"],
  ["/api/analytics", apex, "function", "function", "analytics endpoint reaches a server function"],
  ["/database/portfolio-schema.sql", apex, 404, 404, "internal database file is blocked"],
  ["/database/portfolio-reviews.sql", apex, 404, 404, "internal database file is blocked"],
  ["/database/README.md", apex, 404, 404, "internal database readme is blocked"],
  ["/review/verify-seo.py", apex, 404, 404, "internal verification script is blocked"],
  ["/review/verify-reviews.cjs", apex, 404, 404, "internal verification script is blocked"],
  ["/review/SEO.md", apex, 404, 404, "internal review notes are blocked"],
  ["/review/fixtures/mock-server.cjs", apex, 404, 404, "internal test fixture is blocked"],
  ["/branding/instagram/README.md", apex, 404, 404, "instagram source material stays out of production"],
  ["/branding/instagram/2026-10-05/feed-post-mobile-first/post.png", apex, 404, 404, "instagram post image stays out of production"],
  ["/no-such-page-20261011", apex, 404, 404, "unknown URL 404s"],
  ["/website-development", "www.scaleupbiz.co.in", 301, 200, "www host redirects to the apex"],
  ["/website-development/", "www.scaleupbiz.co.in", 301, 200, "www host redirects to the apex"],
  ["/styles.css", "scaleupbiz.vercel.app", 301, 200, "preview host redirects to the apex"],
  ["/", "scaleupbiz.vercel.app", 301, 200, "preview host root redirects to the apex"]
];

let failures = 0;
for (const [request, host, firstExpected, finalExpected, description] of cases) {
  const outcome = follow(request, host);
  const firstStatus = outcome.chain.length > 1 ? Number(outcome.chain[1].match(/--(\d+)-->/)[1]) : outcome.status;
  const ok = firstStatus === firstExpected && outcome.status === finalExpected;
  if (!ok) failures++;
  console.log((ok ? "  ok   " : "  FAIL ") + request.padEnd(58) + host.padEnd(22) + String(firstStatus).padEnd(6) + String(outcome.status).padEnd(8) + description);
  if (!ok) console.log("        " + outcome.chain.join("  ") + "   final: " + outcome.final);
}

// The bare service URL must land on the canonical page file with exactly one
// redirect followed by one rewrite, and never loop. The chain records the
// starting point and each redirect hop, so one redirect means two entries.
const bare = follow("/website-development", apex);
assert.equal(bare.status, 200, "bare service URL reaches a page");
assert.equal(bare.chain.length, 2, "one redirect then one lookup, no extra hops");
assert.equal(bare.final, "/website-development/index.html", "lands on the canonical page file");

// Internal paths must never resolve to a real file, even though the files exist
// locally while the exclusion keeps them out of the deployment.
for (const internal of ["/database/portfolio-schema.sql", "/review/verify-seo.py", "/review/fixtures/mock-server.cjs"]) {
  const outcome = follow(internal, apex);
  assert.equal(outcome.status, 404, internal + " must not be reachable");
  assert.ok(!localFileExists(outcome.final), internal + " must not map onto a real file");
}

console.log(failures === 0 ? "\nPASS: routing resolves every expected URL with no loops and blocks internal paths."
  : "\n" + failures + " routing case(s) failed.");
process.exit(failures === 0 ? 0 : 1);
