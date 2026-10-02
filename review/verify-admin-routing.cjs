// Rewritten /admin URLs must load the same files as /admin/.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
const expectedAssets = ['/styles.css', '/admin/admin.css', '/content-config.js', '/admin/live-tracking.js', '/admin/admin.js'];
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
console.log('PASS: admin assets resolve correctly with or without a trailing slash and query string.');
