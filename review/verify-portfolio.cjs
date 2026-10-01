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
const faqSource = fs.readFileSync(path.join(root, 'faq.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const work = html.slice(html.indexOf('    <!-- ===================== SELECTED WORK'), html.indexOf('    <section class="section" id="services"'));
const workCSS = css.slice(css.indexOf('/* =========================================================\n   Selected work'), css.indexOf('/* Responsive layout'));
assert.equal(hash(work), '8c5ea3e518433e165218ed6e6718bf3bc25a5a5a67eb205a32d469267d484e9d', 'Completed work HTML must remain unchanged');
assert.equal(hash(workCSS), '22690da151b9521e3afe74d05fd89b973901200dd182f0c4305dc4293b91e213', 'Completed work CSS must remain unchanged');
assert.deepEqual([...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]), ['home', 'work', 'services', 'nfc', 'process', 'testimonials', 'faq', 'about', 'cta', 'contact']);
assert(!/bgCanvas|roleRotator|wheelStage|skill-fill|21 November|scroll-show\.js/.test(html + source));
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) assert(fs.existsSync(path.join(root, match[1])), match[1]);
assert.match(html, /type="email"/);
assert.match(html, /action="https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+" method="post"/);
assert.match(html, /Send message/);
assert.match(html, /name="_gotcha"/);
assert(!/Continue in email/.test(html));
assert.match(html, /src="content-config\.js"/);
assert.match(html, /src="portfolio-content\.js"/);
assert.match(html, /<link rel="stylesheet" href="faq\.css" \/>/, 'The FAQ stylesheet is linked');
assert.match(html, /<script src="portfolio-content\.js"><\/script>\s*<script src="faq\.js"><\/script>/, 'The accordion script runs after the CMS content layer');
assert.match(html, /href="#faq"/, 'The FAQ section is reachable from the navigation');
assert.match(faqSource, /prefers-reduced-motion: reduce/, 'The accordion honours reduced motion');
assert(!/fetch\(|XMLHttpRequest/.test(faqSource), 'The accordion script makes no network requests of its own');

function element() {
  const classes = new Set();
  return {
    listeners: {}, attributes: {}, value: '', textContent: '', href: '', validityMessage: '',
    classList: { add: x => classes.add(x), remove: (...names) => names.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle(x, force) { if (force === true) { classes.add(x); return true; } if (force === false || classes.has(x)) { classes.delete(x); return false; } classes.add(x); return true; } },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; }, getAttribute(name) { return this.attributes[name]; }, removeAttribute() {}, focus() {}, contains() { return false; }, querySelectorAll() { return []; },
    setCustomValidity(message) { this.validityMessage = message; }
  };
}
const ids = Object.fromEntries(['year', 'navToggle', 'navLinks', 'contactForm', 'formFoot', 'sendButton', 'name', 'email', 'message', 'nfcStage', 'nfcJourneyCopy'].map(id => [id, element()]));
const nfcSteps = ['1', '2', '3'].map(step => { const button = element(); button.setAttribute('data-nfc-step', step); return button; });
let nativeValid = true;
ids.contactForm.reportValidity = () => nativeValid && ['name', 'email', 'message'].every(id => !ids[id].validityMessage);
ids.contactForm.action = 'https://formspree.io/f/xzezwkeq';
let resets = 0;
ids.contactForm.reset = () => { resets++; };
let accepted = true;
const sent = [];
vm.runInNewContext(source, {
  document: { getElementById: id => ids[id], addEventListener() {}, querySelectorAll(selector) { return selector === '[data-nfc-step]' ? nfcSteps : []; } },
  window: { innerWidth: 1440, addEventListener() {} },
  FormData: class { constructor(form) { assert.equal(form, ids.contactForm); } },
  fetch: async (url, options) => { sent.push({ url, options }); return { ok: accepted }; }
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
async function verifyContact() {
  const submit = () => ids.contactForm.listeners.submit({ preventDefault() {} });
  ids.name.value = '  ';
  ids.email.value = 'test@example.com';
  ids.message.value = 'A website project';
  await submit();
  assert.equal(sent.length, 0, 'Blank name blocks submission');
  ids.name.value = 'Test visitor';
  nativeValid = false;
  await submit();
  assert.equal(sent.length, 0, 'Invalid form blocks submission');
  nativeValid = true;
  await submit();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, ids.contactForm.action);
  assert.equal(sent[0].options.headers.Accept, 'application/json');
  assert.equal(resets, 1);
  assert.match(ids.formFoot.textContent, /Message received/);
  assert(ids.formFoot.classList.contains('is-success'));
  assert.equal(ids.sendButton.disabled, false);
  ids.contactForm.listeners.input({ target: ids.message });
  assert.equal(ids.formFoot.textContent, '');
  accepted = false;
  await submit();
  assert.equal(resets, 1, 'Failed submission retains the form');
  assert.match(ids.formFoot.textContent, /not sent/);
  assert(ids.formFoot.classList.contains('is-error'));
  assert.equal(ids.sendButton.disabled, false);
  console.log('PASS: preserved portfolio, Formspree submission, confirmation, and failure recovery.');
}
verifyContact().catch(error => { console.error(error); process.exitCode = 1; });

/* FAQ accordion: single-open behaviour, keyboard support, and the reduced-motion guard. */
function verifyFaq() {
  const classes = new Set();
  const makeItem = (index, panelId) => {
    const panel = { id: panelId, attributes: { hidden: true } };
    const button = {
      attributes: { 'aria-expanded': 'false' },
      listeners: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      addEventListener(type, callback) { this.listeners[type] = callback; },
      focus() { this.focused = true; }
    };
    const item = {
      index, panel, button,
      dataset: {},
      classes: new Set([index === 0 ? 'is-visible' : 'motion-reveal']),
      style: { setProperty: (key, value) => { item.style.map.set(key, value); }, map: new Map() },
      classList: {
        add: name => item.classes.add(name),
        remove: name => item.classes.delete(name),
        contains: name => item.classes.has(name),
        toggle(name, force) { if (force === true) { item.classes.add(name); return true; } if (force === false || item.classes.has(name)) { item.classes.delete(name); return false; } item.classes.add(name); return true; }
      },
      querySelector: selector => selector === '.faq-trigger' ? button : selector === '.faq-panel' ? panel : null
    };
    panel.hidden = true;
    return item;
  };
  const items = [makeItem(0, 'faq-panel-1'), makeItem(1, 'faq-panel-2')];
  const pressed = { reduce: false };
  const list = {
    querySelectorAll: () => items,
    querySelector: selector => items.find(item => selector === '.faq-item.is-open' && item.classes.has('is-open')) || null
  };
  vm.runInNewContext(faqSource, {
    document: {
      querySelector: selector => selector === '.faq-list' ? list : null,
      addEventListener(type, callback) { if (type === 'keydown') pressed.keydown = callback; },
      dispatchEvent: () => true,
      documentElement: { classList: { add: () => {} } }
    },
    window: { matchMedia: query => ({ matches: pressed.reduce, addEventListener() {} }), IntersectionObserver: class { observe() {} unobserve() {} } }
  });
  const isOpen = item => item.classes.has('is-open');
  items[0].button.listeners.click();
  assert.ok(isOpen(items[0]), 'Clicking a question opens it');
  assert.equal(items[0].button.getAttribute('aria-expanded'), 'true');
  assert.equal(items[0].panel.hidden, false);
  items[1].button.listeners.click();
  assert.ok(isOpen(items[1]));
  assert.ok(!isOpen(items[0]), 'Opening one item closes the others');
  assert.equal(items[0].button.getAttribute('aria-expanded'), 'false');
  assert.equal(items[0].panel.hidden, true, 'A closed panel is hidden from assistive technology');
  items[1].button.listeners.click();
  assert.ok(!isOpen(items[1]), 'Clicking an open item closes it');
  items[0].button.listeners.click();
  pressed.keydown({ key: 'Escape' });
  assert.ok(!isOpen(items[0]), 'Escape closes the open item');
  items[0].button.listeners.click();
  const focused = () => items.filter(item => item.button.focused).map(item => item.index);
  items.forEach(item => { item.button.focused = false; });
  items[0].button.listeners.keydown({ key: 'ArrowDown', preventDefault() {} });
  assert.deepEqual(focused(), [1], 'ArrowDown moves to the next question');
  items.forEach(item => { item.button.focused = false; });
  items[1].button.listeners.keydown({ key: 'ArrowUp', preventDefault() {} });
  assert.deepEqual(focused(), [0], 'ArrowUp moves to the previous question');
  items.forEach(item => { item.button.focused = false; });
  items[1].button.listeners.keydown({ key: 'ArrowDown', preventDefault() {} });
  assert.deepEqual(focused(), [0], 'ArrowDown wraps from the last item to the first');
  console.log('PASS: FAQ accordion opens one item at a time, closes on Escape, and supports arrow keys.');
}
verifyFaq();
