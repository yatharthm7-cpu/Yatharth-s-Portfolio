const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const checks = [
  ['faq.js exists', fs.existsSync(path.join(root, 'faq.js'))],
  ['faq.css exists', fs.existsSync(path.join(root, 'faq.css'))]
];

if (fs.existsSync(path.join(root, 'index.html'))) {
  const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  checks.push(['faq section present', h.includes('id="faq"')]);
  checks.push(['faq items: ' + (h.match(/class="faq-item"/g) || []).length, true]);
  checks.push(['faq.css linked', h.includes('href="faq.css"')]);
  checks.push(['faq.js loaded', h.includes('src="faq.js"')]);
  checks.push(['nav faq link', h.includes('href="#faq"')]);
  checks.push(['faq.js after portfolio-content.js', h.indexOf('portfolio-content.js') < h.indexOf('src="faq.js"')]);
}

if (fs.existsSync(path.join(root, 'portfolio-content.js'))) {
  const p = fs.readFileSync(path.join(root, 'portfolio-content.js'), 'utf8');
  checks.push(['cms faq render path', p.includes("kind === \"faq\"")]);
  checks.push(['cms faq list target', p.includes('.faq-list')]);
}

if (fs.existsSync(path.join(root, 'database', 'portfolio-seed.sql'))) {
  const s = fs.readFileSync(path.join(root, 'database', 'portfolio-seed.sql'), 'utf8');
  checks.push(['faq seed rows: ' + (s.match(/'faq'/g) || []).length, true]);
}

if (fs.existsSync(path.join(root, 'database', 'portfolio-schema.sql'))) {
  const sc = fs.readFileSync(path.join(root, 'database', 'portfolio-schema.sql'), 'utf8');
  checks.push(['schema allows faq kind', sc.includes("'faq'")]);
}

if (fs.existsSync(path.join(root, 'admin', 'admin.js'))) {
  const a = fs.readFileSync(path.join(root, 'admin', 'admin.js'), 'utf8');
  checks.push(['admin faqsTab handled', a.includes('faqsTab')]);
  checks.push(['admin faq fields', a.includes('faqFields')]);
  checks.push(['admin answer field', a.includes('entryAnswer')]);
}

checks.forEach(([label, ok]) => console.log((ok ? 'OK  ' : 'MISS') + '  ' + label));
process.exitCode = checks.some(([, ok]) => !ok) ? 1 : 0;
