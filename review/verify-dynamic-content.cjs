const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'portfolio-content.js'), 'utf8');

class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = ''; }
  set className(value) { this.attributes.class = value; }
  get className() { return this.attributes.class; }
  append(...children) { this.children.push(...children); this.lastChild = this.children.at(-1); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
}

const entries = [
  { id: 'one', kind: 'project', title: '<script>Project</script>', subtitle: 'Web', description: 'A real build.', details: { alt: 'Homepage', contribution: 'Design and build' }, image_url: 'assets/work-shakti.jpg', link_url: 'https://example.com/', link_label: 'View project' },
  { id: 'two', kind: 'service', title: 'Website design', subtitle: 'WEB', description: 'A considered website.', details: { bullets: ['Design', 'Build'] }, link_url: '#contact', link_label: 'Discuss project' },
  { id: 'three', kind: 'faq', title: 'How long does a site take?', subtitle: '01 / Websites', description: 'Two to four weeks.\n\nLarger projects take longer.', details: {}, image_url: null, link_url: null, link_label: '' }
];

async function run(fetchResponse) {
  const workGrid = new Element();
  const servicesGrid = new Element();
  const faqList = new Element();
  const counter = new Element();
  const intro = new Element();
  const elements = { '.project-grid': workGrid, '.grid-services': servicesGrid, '.faq-list': faqList, '.work-eyebrow span': counter, '.work-intro': intro };
  const calls = [];
  const dispatched = [];
  const document = {
    querySelector: selector => elements[selector],
    createElement: tag => new Element(tag),
    dispatchEvent: event => { dispatched.push(event.type); return true; }
  };
  vm.runInNewContext(source, {
    window: { PORTFOLIO_CONTENT_CONFIG: { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' } },
    document, URL,
    CustomEvent: class { constructor(type) { this.type = type; } },
    fetch: async (url, options) => { calls.push({ url, options }); return fetchResponse; }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { workGrid, servicesGrid, faqList, counter, intro, calls, dispatched };
}

async function main() {
  const result = await run({ ok: true, json: async () => entries });
  assert.equal(result.calls[0].options.headers.apikey, 'sb_publishable_test');
  assert.match(result.calls[0].url, /published=eq\.true/);
  assert.equal(result.workGrid.children.length, 1);
  assert.equal(result.servicesGrid.children.length, 1);
  const project = result.workGrid.children[0];
  assert.equal(project.children[1].children[1].textContent, '<script>Project</script>', 'Content stays text, not HTML');
  assert.equal(result.counter.textContent, '/ 01—01');
  const service = result.servicesGrid.children[0];
  assert.equal(service.children[3].children.length, 2);

  const faq = result.faqList.children[0];
  assert.ok(faq, 'A FAQ entry renders into the accordion');
  const trigger = faq.children[0].children[0];
  const question = trigger.children[0];
  assert.equal(question.attributes.class, 'faq-q', 'The question is wrapped for the service tag');
  assert.equal(question.children[0].attributes.class, 'faq-tag', 'The subtitle renders as a service tag');
  assert.equal(question.children[0].textContent, '01 / Websites');
  assert.equal(question.children[1].textContent, 'How long does a site take?', 'The title becomes the trigger label');
  const answer = faq.children[1].children[0].children[0];
  assert.equal(answer.children.length, 2, 'A blank line splits the answer into two staggered paragraphs');
  assert.equal(answer.children[0].textContent, 'Two to four weeks.');
  assert.equal(trigger.children[1].attributes['aria-hidden'], 'true', 'The decorative icon is hidden from screen readers');
  assert.ok(result.dispatched.includes('faq:content-rendered'), 'Rendering FAQ entries signals the accordion to re-bind');

  const failed = await run({ ok: false });
  assert.equal(failed.workGrid.children.length, 0, 'A failed API call does not replace built-in cards');
  console.log('PASS: published content renders safely and API failures retain the portfolio fallback.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
