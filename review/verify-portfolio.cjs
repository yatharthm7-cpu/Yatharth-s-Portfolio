// Dependency-free regression checks. Mailto navigation is captured, never opened.
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
assert.match(html, /Continue in email/);

function element() {
  const classes = new Set();
  return {
    listeners: {}, value: '', textContent: '', href: '', validityMessage: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x) { if (classes.has(x)) { classes.delete(x); return false; } classes.add(x); return true; } },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute() {}, removeAttribute() {}, focus() {}, contains() { return false; }, querySelectorAll() { return []; },
    setCustomValidity(message) { this.validityMessage = message; }
  };
}
const ids = Object.fromEntries(['year', 'navToggle', 'navLinks', 'contactForm', 'formFoot', 'emailFallback', 'name', 'email', 'message'].map(id => [id, element()]));
let nativeValid = true;
ids.contactForm.reportValidity = () => nativeValid && ['name', 'email', 'message'].every(id => !ids[id].validityMessage);
const location = { href: '' };
vm.runInNewContext(source, {
  document: { getElementById: id => ids[id], addEventListener() {}, querySelectorAll() { return []; } },
  window: { location, innerWidth: 1440, addEventListener() {} }
});
let prevented = 0;
const submit = () => ids.contactForm.listeners.submit({ preventDefault() { prevented++; } });
ids.name.value = '  '; ids.email.value = 'test@example.com'; ids.message.value = 'A project';
submit(); assert.equal(location.href, '', 'Whitespace-only name must not open a draft');
ids.name.value = 'A & B <studio>'; ids.message.value = 'Hello & thank you?\nA café website.';
nativeValid = false; submit(); assert.equal(location.href, '', 'Native validity failure must block handoff');
nativeValid = true; submit();
const draft = new URL(location.href);
assert.equal(draft.protocol, 'mailto:');
assert.equal(draft.pathname, 'yatharthm7@gmail.com');
assert.equal(draft.searchParams.get('subject'), 'Portfolio enquiry from A & B <studio>');
assert.equal(draft.searchParams.get('body'), 'Hello & thank you?\nA café website.\n\nFrom: A & B <studio>\nEmail: test@example.com');
assert.equal(ids.emailFallback.href, location.href);
assert.match(ids.formFoot.textContent, /Nothing has been sent by this website/);
assert(!ids.formFoot.textContent.includes('<studio>'), 'User input is never inserted into status HTML');
ids.message.value = 'Updated scope';
ids.contactForm.listeners.input({ target: ids.message });
assert.equal(ids.emailFallback.href, 'mailto:yatharthm7@gmail.com');
assert.equal(ids.formFoot.textContent, '');
submit(); assert.match(new URL(location.href).searchParams.get('body'), /^Updated scope/);
assert.equal(prevented, 4);
console.log('PASS: preserved project cards, section order, assets, removed effects, native validation, safe draft encoding, honest status, and repeat handoff.');
