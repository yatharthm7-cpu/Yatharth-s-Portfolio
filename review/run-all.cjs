"use strict";
// Runs every review suite and reports a single pass/fail for the whole set.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nodeSuites = [
  "verify-portfolio.cjs",
  "verify-service-page.cjs",
  "verify-admin-routing.cjs",
  "verify-routing.cjs",
  "verify-public-seo.cjs",
  "verify-analytics.cjs",
  "verify-live-tracking.cjs",
  "verify-motion.cjs",
  "verify-reviews.cjs",
  "verify-dynamic-content.cjs",
  "verify-testimonial-cards.cjs",
  "check-faq.cjs",
  "verify-credential-scanner.cjs",
  "scan-credentials.cjs",
];
const pySuites = ["verify-seo.py"];

let failed = 0;
for (const file of nodeSuites) {
  try {
    execFileSync(process.execPath, [path.join(root, "review", file)], { stdio: "ignore", cwd: root });
    console.log("OK   " + file);
  } catch {
    console.log("FAIL " + file);
    failed++;
  }
}
for (const file of pySuites) {
  try {
    execFileSync("python", [path.join(root, "review", file)], { stdio: "ignore", cwd: root });
    console.log("OK   " + file);
  } catch {
    console.log("FAIL " + file);
    failed++;
  }
}

console.log(failed === 0 ? "\nALL " + (nodeSuites.length + pySuites.length) + " SUITES PASS"
  : "\n" + failed + " SUITE(S) FAILED");
process.exit(failed === 0 ? 0 : 1);
