"use strict";
// Reports the local assets each public page references, so payload claims are
// evidence-based rather than whole-directory totals.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = ["index.html", "website-development/index.html", "privacy.html", "404.html", "admin/index.html"];

const attrs = /(?:src|href)=["']([^"']+)["']/g;
function localAssets(html, pageDir) {
  const out = new Set();
  let match;
  while ((match = attrs.exec(html))) {
    const value = match[1];
    if (/^https?:|^\/\/|^data:|^#|^mailto:|^tel:/.test(value)) continue;
    if (/\.(png|jpe?g|webp|svg|gif|avif|css|js|ico|woff2?)$/i.test(value)) out.add(value);
  }
  return [...out];
}

for (const page of pages) {
  const full = path.join(root, page);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, "utf8");
  const refs = localAssets(html, path.dirname(page));
  let total = 0, missing = 0;
  const rows = [];
  for (const ref of refs) {
    const resolved = ref.startsWith("/") ? path.join(root, ref.slice(1)) : path.resolve(path.dirname(full), ref);
    const exists = fs.existsSync(resolved);
    const bytes = exists ? fs.statSync(resolved).size : 0;
    if (!exists) missing++;
    total += bytes;
    rows.push({ ref, kb: bytes / 1024, exists });
  }
  rows.sort((a, b) => b.kb - a.kb);
  console.log("\n=== " + page + " (" + refs.length + " local refs, " + (total / 1024).toFixed(1) + " KB" + (missing ? ", " + missing + " MISSING" : "") + ") ===");
  for (const r of rows.slice(0, 12)) {
    console.log("  " + (r.kb).toFixed(1).padStart(8) + " KB  " + (r.exists ? "  " : "MISS") + "  " + r.ref);
  }
}
