const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'portfolio-content.js'), 'utf8');

class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = ''; }
  append(...children) { this.children.push(...children); this.lastChild = this.children.at(-1); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
}

const entries = [
  { id: 'one', kind: 'project', title: '<script>Project</script>', subtitle: 'Web', description: 'A real build.', details: { alt: 'Homepage', contribution: 'Design and build' }, image_url: 'assets/work-shakti.jpg', link_url: 'https://example.com/', link_label: 'View project' },
  { id: 'two', kind: 'service', title: 'Website design', subtitle: 'WEB', description: 'A considered website.', details: { bullets: ['Design', 'Build'] }, link_url: '#contact', link_label: 'Discuss project' }
];

async function run(fetchResponse) {
  const workGrid = new Element();
  const servicesGrid = new Element();
  const counter = new Element();
  const intro = new Element();
  const elements = { '.project-grid': workGrid, '.grid-services': servicesGrid, '.work-eyebrow span': counter, '.work-intro': intro };
  const calls = [];
  const document = { querySelector: selector => elements[selector], createElement: tag => new Element(tag) };
  vm.runInNewContext(source, {
    window: { PORTFOLIO_CONTENT_CONFIG: { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' } },
    document, URL, fetch: async (url, options) => { calls.push({ url, options }); return fetchResponse; }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { workGrid, servicesGrid, counter, intro, calls };
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

  const failed = await run({ ok: false });
  assert.equal(failed.workGrid.children.length, 0, 'A failed API call does not replace built-in cards');
  console.log('PASS: published content renders safely and API failures retain the portfolio fallback.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
