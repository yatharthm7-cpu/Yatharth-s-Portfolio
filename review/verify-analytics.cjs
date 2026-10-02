const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');
function el() {
  return { hidden: true, listeners: {}, textContent: '', value: 'Test', style: { setProperty() {} },
    addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute() {}, focus() {}, querySelectorAll() { return []; },
    classList: { add() {}, remove() {} }, setCustomValidity() {} };
}
function environment({ hostname = 'scaleupbiz.co.in', pathname = '/', choice = '', storageFails = false } = {}) {
  const accept = el(), reject = el(), settings = el(), scripts = [], nodes = [], listeners = {};
  const notice = el();
  notice.querySelector = selector => selector.includes('accept') ? accept : reject;
  let stored = choice, reloads = 0, cookie = '_ga=test; _ga_3SM0E2QYPQ=test; unrelated=keep';
  const cookieWrites = [];
  const document = { referrer: 'https://www.instagram.com/path?email=private@example.com',
    body: { appendChild(node) { nodes.push(node); } }, head: { appendChild(node) { scripts.push(node); } },
    createElement(type) { return type === 'div' ? notice : {}; },
    querySelectorAll() { return [settings]; }, addEventListener(type, fn) { listeners[type] = fn; }
  };
  Object.defineProperty(document, 'cookie', { get: () => cookie, set: value => { cookieWrites.push(value); } });
  const window = { location: { hostname, pathname, origin: 'https://' + hostname, search: '?email=private@example.com', hash: '#secret', reload() { reloads++; } },
    localStorage: { getItem() { if (storageFails) throw Error('blocked'); return stored; }, setItem(k, v) { if (storageFails) throw Error('blocked'); stored = v; } }
  };
  vm.runInNewContext(source, { window, document, URL });
  return { window, document, notice, accept, reject, settings, scripts, nodes, listeners, cookieWrites, reloads: () => reloads, stored: () => stored };
}
const a = environment();
assert.equal(a.scripts.length, 0, 'No Google script before consent');
assert.equal(a.notice.hidden, false);
a.window.ScaleUpAnalytics.trackLead('portfolio');
assert.equal(a.window.dataLayer, undefined, 'No queued lead before consent');
a.accept.listeners.click();
assert.equal(a.scripts.length, 1);
assert.match(a.scripts[0].src, /G-3SM0E2QYPQ$/);
assert.equal(a.stored(), 'accepted');
const config = Array.from(a.window.dataLayer[2]);
assert.equal(config[2].page_location, 'https://scaleupbiz.co.in/');
assert.equal(config[2].page_referrer, 'https://www.instagram.com/');
assert.equal(config[2].allow_google_signals, false);
assert.equal(config[2].allow_ad_personalization_signals, false);
a.accept.listeners.click();
assert.equal(a.scripts.length, 1, 'No duplicate initialization');
a.window.ScaleUpAnalytics.trackLead('portfolio');
assert.equal(a.window.dataLayer[3][1], 'generate_lead');
const click = href => a.listeners.click({ target: { closest: () => ({ getAttribute: () => href }) } });
click('mailto:yatharth@scaleupbiz.co.in?body=private');
click('https://wa.me/919638902001?text=private');
assert.equal(a.window.dataLayer[4][1], 'email_click');
assert.equal(a.window.dataLayer[5][1], 'whatsapp_click');
assert(!JSON.stringify(a.window.dataLayer).includes('private'), 'No raw contact links, query strings or referrer paths');
a.reject.listeners.click();
assert.equal(a.reloads(), 1, 'Withdrawal unloads Google library');
assert.equal(a.window['ga-disable-G-3SM0E2QYPQ'], true);
assert(a.cookieWrites.every(value => !value.startsWith('unrelated=')), 'Leave unrelated cookies untouched');
const length = a.window.dataLayer.length;
a.window.ScaleUpAnalytics.trackLead('portfolio');
assert.equal(a.window.dataLayer.length, length, 'No events after withdrawal');
assert.equal(environment({ choice: 'rejected' }).scripts.length, 0);
assert.equal(environment({ choice: 'accepted' }).scripts.length, 1);
assert.equal(environment({ hostname: 'localhost', choice: 'accepted' }).scripts.length, 0);
assert.equal(environment({ pathname: '/admin/', choice: 'accepted' }).nodes.length, 0);
assert.equal(environment({ pathname: '/404.html', choice: 'accepted' }).nodes.length, 0);
assert.equal(environment({ storageFails: true }).scripts.length, 0);

async function formChecks(file, service) {
  const formId = service ? 'wdEnquiryForm' : 'contactForm';
  const statusId = service ? 'wdStatus' : 'formFoot';
  const buttonId = service ? 'wdSend' : 'sendButton';
  const fields = service ? ['wd-name', 'wd-email', 'wd-message'] : ['name', 'email', 'message'];
  const ids = Object.fromEntries([formId, statusId, buttonId, ...fields, 'year', 'navToggle', 'navLinks', 'wd-url'].map(id => [id, el()]));
  ids[formId].reset = () => {};
  let valid = true, ok = true, sent = 0;
  ids[formId].reportValidity = () => valid;
  const leads = [];
  const window = { innerWidth: 1440, addEventListener() {}, ScaleUpAnalytics: { trackLead(value) { leads.push(value); } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
    window, document: { getElementById: id => ids[id] || null, querySelectorAll: () => [], addEventListener() {} },
    FormData: class {}, fetch: async () => { sent++; return { ok }; }
  });
  const submit = () => ids[formId].listeners.submit({ preventDefault() {} });
  valid = false; await submit(); assert.equal(sent, 0); assert.equal(leads.length, 0);
  valid = true; ok = false; await submit(); assert.equal(leads.length, 0, 'Failures are not leads');
  ok = true; const pending = submit(); await submit(); await pending;
  assert.equal(sent, 2, 'Double submission blocked while pending');
  assert.deepEqual(leads, [service ? 'website_development' : 'portfolio']);
  // An unavailable analytics helper must never prevent contact delivery.
  delete window.ScaleUpAnalytics; await submit();
  assert.match(ids[statusId].textContent, /received/);
}
Promise.all([formChecks('script.js', false), formChecks('website-development/service.js', true)])
  .then(() => console.log('PASS: consent, privacy, production guards, contact clicks and successful-only lead tracking.'))
  .catch(error => { console.error(error); process.exitCode = 1; });
