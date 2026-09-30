// Dependency-free regression checks for the static portfolio.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8').replace(/\r\n/g, '\n');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const work = html.slice(html.indexOf('    <!-- ===================== SELECTED WORK'), html.indexOf('    <section class="section" id="services"'));
const workCSS = css.slice(css.indexOf('/* =========================================================\n   Selected work'), css.indexOf('/* Responsive layout'));
assert.equal(hash(work), '8c5ea3e518433e165218ed6e6718bf3bc25a5a5a67eb205a32d469267d484e9d', 'Completed work HTML must remain unchanged');
assert.equal(hash(workCSS), '22690da151b9521e3afe74d05fd89b973901200dd182f0c4305dc4293b91e213', 'Completed work CSS must remain unchanged');
assert.deepEqual([...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]), ['home', 'work', 'services', 'nfc', 'process', 'about', 'contact']);
assert(!/bgCanvas|roleRotator|wheelStage|skill-fill|21 November|scroll-show\.js/.test(html + source));
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) assert(fs.existsSync(path.join(root, match[1])), match[1]);
assert.match(html, /type="email"/);
assert.match(html, /action="https:\/\/formsubmit\.co\/yatharthm7@gmail\.com" method="POST"/);
assert.match(html, /name="_next" value="https:\/\/midcurve-five\.vercel\.app\/thank-you\.html"/);
assert.match(html, /name="_honey"/);
assert.match(html, /Send message/);
assert(!/Continue in email/.test(html));
assert(fs.existsSync(path.join(root, 'thank-you.html')));
assert.match(fs.readFileSync(path.join(root, 'thank-you.html'), 'utf8'), /Form submitted/);

function element() {
  const classes = new Set();
  return {
    listeners: {}, attributes: {}, value: '', textContent: '', href: '', validityMessage: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, force) { if (force === true) { classes.add(x); return true; } if (force === false || classes.has(x)) { classes.delete(x); return false; } classes.add(x); return true; } },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; }, getAttribute(name) { return this.attributes[name]; }, removeAttribute() {}, focus() {}, contains() { return false; }, querySelectorAll() { return []; },
    setCustomValidity(message) { this.validityMessage = message; }
  };
}
const ids = Object.fromEntries(['year', 'navToggle', 'navLinks', 'nfcStage', 'nfcJourneyCopy'].map(id => [id, element()]));
const nfcSteps = ['1', '2', '3'].map(step => { const button = element(); button.setAttribute('data-nfc-step', step); return button; });
vm.runInNewContext(source, {
  document: { getElementById: id => ids[id], addEventListener() {}, querySelectorAll(selector) { return selector === '[data-nfc-step]' ? nfcSteps : []; } },
  window: { innerWidth: 1440, addEventListener() {} }
});
nfcSteps[1].listeners.click();
assert.equal(ids.nfcStage.getAttribute('data-step'), '2');
assert.match(ids.nfcJourneyCopy.textContent, /Google review page/);
assert.equal(nfcSteps[1].getAttribute('aria-pressed'), 'true');
assert.equal(nfcSteps[0].getAttribute('aria-pressed'), 'false');
nfcSteps[2].listeners.click();
assert.equal(ids.nfcStage.getAttribute('data-step'), '3');
assert.match(ids.nfcJourneyCopy.textContent, /choose whether/);
assert.equal(nfcSteps[2].getAttribute('aria-pressed'), 'true');
console.log('PASS: preserved project cards, section order, assets, Tapvora journey, contact endpoint, and confirmation page.');
