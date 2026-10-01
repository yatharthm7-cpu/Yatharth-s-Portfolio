const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'testimonial-cards.js'), 'utf8');
function element() {
  const classes = new Set();
  return {
    attributes: {}, listeners: {},
    classList: { add: value => classes.add(value), contains: value => classes.has(value), toggle(value, enabled) { enabled ? classes.add(value) : classes.delete(value); } },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { document.activeElement = this; }
  };
}
const cards = [element(), element(), element()];
const buttons = [element(), element(), element()];
const controls = { hidden: true };
const showcase = element();
showcase.querySelector = () => controls;
showcase.querySelectorAll = selector => selector === '[data-card-index]' ? cards : buttons;
showcase.contains = item => cards.includes(item) || buttons.includes(item);
const document = { activeElement: null, querySelector: () => showcase };
vm.runInNewContext(source, { document });
function active(index) {
  assert.equal(showcase.attributes['data-active-card'], String(index));
  cards.forEach((card, i) => assert.equal(card.classList.contains('is-active'), i === index));
  buttons.forEach((button, i) => assert.equal(button.attributes['aria-pressed'], String(i === index)));
}
active(2);
assert.equal(controls.hidden, false);
assert(showcase.classList.contains('is-enhanced'));
cards[0].listeners.pointerenter({ pointerType: 'mouse' });
active(0);
showcase.listeners.pointerleave();
active(2);
buttons[1].listeners.click();
active(1);
cards[0].listeners.pointerdown({ pointerType: 'touch' });
active(0);
showcase.listeners.pointerleave();
active(0);
assert.equal(cards[0].listeners.click, undefined, 'Project links retain native single-click navigation');
document.activeElement = cards[1];
cards[1].listeners.focusin();
showcase.listeners.pointerleave();
active(1);
showcase.listeners.focusout({ relatedTarget: null });
active(0);
let prevented = 0;
buttons[2].listeners.keydown({ key: 'ArrowRight', preventDefault() { prevented++; } });
active(0);
assert.equal(document.activeElement, buttons[0]);
assert.equal(prevented, 1);
buttons[0].listeners.keydown({ key: 'ArrowLeft', preventDefault() {} });
active(2);
buttons[2].listeners.keydown({ key: 'Home', preventDefault() {} });
active(0);
buttons[0].listeners.keydown({ key: 'End', preventDefault() {} });
active(2);
showcase.listeners.keydown({ key: 'Escape' });
active(2);
vm.runInNewContext(source, { document: { querySelector: () => null } });
console.log('PASS: testimonial cards support hover, touch selection, keyboard navigation, and native project links.');
