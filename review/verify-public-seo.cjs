"use strict";
// Technical SEO check across the three public pages: metadata, headings,
// canonical, language/viewport, structured-data validity, and internal links.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const BASE = "https://scaleupbiz.co.in/";
const pages = [
  { file: "index.html", canonical: BASE, needSchema: ["Organization", "WebSite", "WebPage"] },
  { file: "website-development/index.html", canonical: BASE + "website-development/", needSchema: ["WebPage", "Service", "BreadcrumbList"] },
  { file: "privacy.html", canonical: BASE + "privacy.html", needSchema: [] }
];

const TAG = /<([a-zA-Z][\w-]*)((?:\s[^>]*)?)>/g;
const ATTR = /([\w:-]+)\s*=\s*"([^"]*)"/g;
function parse(source) {
  const tags = [];
  let match;
  while ((match = TAG.exec(source))) {
    const attrs = {};
    let attr;
    while ((attr = ATTR.exec(match[2]))) attrs[attr[1]] = attr[2];
    tags.push({ tag: match[1], attrs });
  }
  return tags;
}

let problems = 0;
function check(ok, message) {
  if (!ok) { problems++; console.log("  FAIL: " + message); }
}

for (const page of pages) {
  const source = fs.readFileSync(path.join(root, page.file), "utf8");
  const tags = parse(source);
  const meta = {};
  for (const t of tags) if (t.tag === "meta") meta[t.attrs.name || t.attrs.property] = t.attrs.content;
  const title = (source.match(/<title>([\s\S]*?)<\/title>/) || [])[1];

  console.log("\n=== " + page.file + " ===");
  check(!!title && title.trim().length > 0, "has a title");
  check((title || "").length <= 60, "title within 60 chars (got " + (title || "").length + ")");
  check(!!meta.description && meta.description.length > 70, "description present and useful");
  check((meta.description || "").length <= 160, "description within 160 chars (got " + (meta.description || "").length + ")");
  check(tags.filter((t) => t.tag === "h1").length === 1, "exactly one h1");
  check((tags.filter((t) => t.tag === "h2").length) >= (page.needSchema.length ? 2 : 1), "has section headings");
  const canonical = tags.find((t) => t.tag === "link" && t.attrs.rel === "canonical");
  check(!!canonical && canonical.attrs.href === page.canonical, "canonical is " + page.canonical);
  check(meta["og:url"] === page.canonical, "og:url matches canonical");
  check(!!meta["og:title"] && !!meta["og:description"] && !!meta["og:image"], "complete open graph metadata");
  check(!!meta["twitter:card"], "has a twitter card");
  check(/<html\s+lang="en"/.test(source), "html lang set");
  check(/<meta name="viewport"/.test(source), "viewport set");
  check(!/noindex/i.test(meta.robots || ""), "not blocked from indexing");

  // Structured data: every ld+json block must parse, required types must be present.
  const blocks = [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const graph = [];
  for (const block of blocks) {
    let parsed;
    try { parsed = JSON.parse(block); } catch (e) { check(false, "ld+json does not parse: " + e.message); continue; }
    const items = parsed["@graph"] || [parsed];
    for (const item of items) if (item && item["@type"]) graph.push(item["@type"]);
  }
  for (const type of page.needSchema) check(graph.includes(type), "structured data includes " + type);
  check(!/aggregateRating/.test(source), "no invented aggregate ratings");
}

// Internal links on the public pages must resolve to a real local file or section.
console.log("\n=== internal links ===");
for (const page of pages) {
  const source = fs.readFileSync(path.join(root, page.file), "utf8");
  const ids = new Set([...source.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]));
  for (const link of [...source.matchAll(/href="([^"]+)"/g)].map((m) => m[1])) {
    if (/^(https?:|mailto:|tel:)/.test(link)) continue;
    if (link.startsWith("#")) { check(ids.has(link.slice(1)), page.file + ": section anchor exists: " + link); continue; }
    const [pathname, hash] = link.split("#");
    const local = pathname.replace(/^\//, "").replace(/\/$/, "");
    let target = local;
    if (local === "") target = "index.html";
    else if (fs.existsSync(path.join(root, local)) && fs.statSync(path.join(root, local)).isDirectory()) target = path.join(local, "index.html");
    check(fs.existsSync(path.join(root, target)), page.file + ": internal link resolves: " + link);
    if (hash) {
      const targetSource = fs.readFileSync(path.join(root, target), "utf8");
      const targetIds = new Set([...targetSource.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]));
      check(targetIds.has(hash), page.file + ": cross-page anchor exists: " + link);
    }
  }
}

console.log(problems === 0 ? "\nPASS: metadata, headings, canonical, structured data and internal links on all public pages."
  : "\n" + problems + " problem(s) found.");
process.exit(problems === 0 ? 0 : 1);
