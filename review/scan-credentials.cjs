"use strict";
// Pattern-based check of tracked working-tree files. Values never enter reports.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const patterns = [
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{8,}\b/g],
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ["Google access token", /\bya29\.[A-Za-z0-9_-]{20,}/g],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ["AWS access key ID", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  ["live payment key", /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g],
];
// These two exact values are mocks in the review API test, never usable keys.
const reviewMocks = new Set(["sb_" + "secret_test", "sb_" + "secret_saved_under_old_name"]);
function findCredentials(source, file) {
  const findings = [];
  const add = (label, index) => findings.push({ file, line: source.slice(0, index).split("\n").length, label });
  for (const [label, pattern] of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (file === "review/verify-reviews.cjs" && reviewMocks.has(match[0])) continue;
      add(label, match.index);
    }
  }
  // Public anon JWTs are expected in older Supabase browser configurations.
  for (const match of source.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split(".")[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") add("Supabase privileged JWT", match.index);
    } catch { /* Not a decodable privileged JWT; other patterns still apply. */ }
  }
  return findings;
}
function scanRepository(root) {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split("\0").filter(Boolean);
  const findings = [];
  let scanned = 0;
  let binary = 0;
  for (const file of files) {
    const target = path.resolve(root, file);
    if (!target.startsWith(path.resolve(root) + path.sep) || !fs.lstatSync(target).isFile()) throw new Error("Unsupported tracked file");
    const bytes = fs.readFileSync(target);
    if (bytes.includes(0)) { binary++; continue; }
    scanned++;
    findings.push(...findCredentials(bytes.toString("utf8"), file.replaceAll("\\", "/")));
  }
  return { scanned, binary, findings };
}
function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--root")) {
    console.error("Usage: node review/scan-credentials.cjs [--root repository]");
    return 2;
  }
  const root = args.length ? path.resolve(args[1]) : path.resolve(__dirname, "..");
  try {
    const { scanned, binary, findings } = scanRepository(root);
    for (const finding of findings) console.error(`${finding.file}:${finding.line} - ${finding.label}`);
    console.log(`Scanned ${scanned} tracked text files; skipped ${binary} binary files; ${findings.length} credential findings.`);
    return findings.length ? 1 : 0;
  } catch {
    console.error("Credential scan could not complete. Check Git access and tracked file readability.");
    return 2;
  }
}
module.exports = { findCredentials, scanRepository };
if (require.main === module) process.exitCode = main();
