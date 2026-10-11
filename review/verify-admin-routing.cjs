// Rewritten /admin URLs must load the same files as /admin/.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
const expectedAssets = ['/styles.css', '/admin/admin.css', '/content-config.js', '/admin/live-tracking.js', '/admin/admin.js', '/admin/reviews.js'];
const localAssets = [...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js))"/g)]
  .map(match => match[1]).filter(value => !value.startsWith('https://'));
assert.deepEqual(localAssets, expectedAssets);
for (const route of ['/admin', '/admin?', '/admin/', '/admin/?next=editor', '/admin/index.html']) {
  for (const asset of localAssets) {
    const resolved = new URL(asset, 'https://example.com' + route);
    assert.equal(resolved.pathname, asset, `${route} resolves ${asset} correctly`);
    assert(fs.existsSync(path.join(root, asset.slice(1))), `Missing asset: ${asset}`);
  }
}

/* Every reachable admin URL shape carries a noindex header, not just the HTML
   page's own meta tag. /admin/:path* does not match the bare "/admin/", which is
   why it needs its own entry. */
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const noindexSources = vercel.headers
  .filter(entry => entry.headers.some(header => header.key === 'X-Robots-Tag' && /noindex/.test(header.value)))
  .map(entry => entry.source);
for (const source of ['/admin', '/admin/', '/admin/:path*']) {
  assert.ok(noindexSources.includes(source), `noindex header covers ${source}`);
}

console.log('PASS: admin assets resolve correctly with or without a trailing slash and query string, and every admin URL carries a noindex header.');
