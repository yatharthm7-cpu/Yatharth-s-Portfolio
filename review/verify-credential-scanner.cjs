"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { findCredentials } = require("./scan-credentials.cjs");
const scanner = path.join(__dirname, "scan-credentials.cjs");
const secret = ["sb", "secret", "SYNTHETIC0123456789abcdefghijk"].join("_");
const jwt = role => [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role })).toString("base64url"),
  "syntheticSignatureForScannerTestsOnly",
].join(".");
assert.equal(findCredentials("SUPABASE_SECRET_KEY service_role TURNSTILE_SECRET_KEY sb_publishable_example " + jwt("anon"), "browser.js").length, 0);
assert.equal(findCredentials(jwt("service_role"), "browser.js")[0].label, "Supabase privileged JWT");
assert.equal(findCredentials(secret + "\n" + secret, "test.js").length, 2, "Tests must not have blanket exemptions");
const knownMock = ["sb", "secret", "saved_under_old_name"].join("_");
assert.equal(findCredentials(knownMock, "review/verify-reviews.cjs").length, 0);
assert.equal(findCredentials(knownMock, "browser.js").length, 1, "Mock exemption is path-specific");
assert.equal(findCredentials(secret, "review/verify-reviews.cjs").length, 1, "Other keys in the fixture file must fail");
assert.equal(findCredentials("one\r\ntwo\r\n" + secret, "file.js")[0].line, 3);
for (const value of [
  "gh" + "p_" + "A".repeat(36), "AK" + "IA" + "A".repeat(16),
  "ya" + "29." + "A".repeat(25), "AI" + "za" + "A".repeat(35),
  "xox" + "b-" + "A".repeat(20), "sk" + "_live_" + "A".repeat(25),
  "-----BEGIN " + "PRIVATE KEY-----",
]) assert.equal(findCredentials(value, "config.txt").length, 1);
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "scaleupbiz-scanner-test-"));
try {
  execFileSync("git", ["init", "--quiet", sandbox], { stdio: "ignore" });
  fs.writeFileSync(path.join(sandbox, "safe.js"), "process.env.SUPABASE_SECRET_KEY;\n");
  fs.writeFileSync(path.join(sandbox, "image.png"), Buffer.from([137, 80, 0, 71]));
  execFileSync("git", ["add", "safe.js", "image.png"], { cwd: sandbox, stdio: "ignore" });
  const run = root => spawnSync(process.execPath, [scanner, "--root", root], {
    cwd: os.tmpdir(), encoding: "utf8", env: { ...process.env, TEMP: "unused-missing-directory" },
  });
  let result = run(sandbox);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skipped 1 binary/);
  fs.writeFileSync(path.join(sandbox, "safe.js"), "// config\n" + secret + "\n" + jwt("service_role"));
  result = run(sandbox);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /safe.js:2 - Supabase secret key/);
  assert.match(result.stderr, /safe.js:3 - Supabase privileged JWT/);
  assert(!result.stderr.includes(secret) && !result.stderr.includes(jwt("service_role")), "Reports must redact values");
  fs.unlinkSync(path.join(sandbox, "safe.js"));
  assert.equal(run(sandbox).status, 2, "Unreadable/deleted tracked source must fail closed");
  assert.equal(run(path.join(sandbox, "missing")).status, 2, "Git errors must fail closed");
} finally {
  const resolved = path.resolve(sandbox);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert(path.basename(resolved).startsWith("scaleupbiz-scanner-test-"));
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log("Credential scanner detection, redaction, exit codes and independent Git listing verified.");
