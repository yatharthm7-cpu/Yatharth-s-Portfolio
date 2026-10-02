// Dependency-free regression checks for the Website Development service page.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pageDir = path.join(root, 'website-development');
const page = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(pageDir, 'service.css'), 'utf8');
const js = fs.readFileSync(path.join(pageDir, 'service.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

/* Metadata */
assert.match(page, /<title>Website Development for Small Businesses \| ScaleUpBiz<\/title>/);
const desc = page.match(/<meta name="description" content="([^"]+)"/)[1];
assert.ok(desc.length >= 50 && desc.length <= 170, 'meta description is a sensible length');
assert.match(page, /<link rel="canonical" href="https:\/\/scaleupbiz\.co\.in\/website-development\/" \/>/);
assert.match(page, /property="og:url" content="https:\/\/scaleupbiz\.co\.in\/website-development\/"/);
assert.match(page, /property="og:image" content="https:\/\/scaleupbiz\.co\.in\/branding\/scaleupbiz-social-preview\.png"/);
assert.match(page, /name="twitter:card" content="summary_large_image"/);
assert.match(page, /name="google-site-verification"/, 'Search Console verification tag is present');

/* One H1, logical headings, section anchors */
assert.equal((page.match(/<h1[\s>]/g) || []).length, 1, 'exactly one H1');
for (const id of ['goals', 'options', 'included', 'builds', 'process', 'quote', 'faq', 'enquire']) {
  assert.match(page, new RegExp('id="' + id + '"'), 'section #' + id + ' exists');
}
assert.match(page, /href="#enquire"/, 'primary actions point at the enquiry section');
assert.match(page, /href="#builds"/, 'secondary action points at the builds section');

/* Cross-page navigation and breadcrumb */
assert.match(page, /href="\/#work"/);
assert.match(page, /href="\/#services"/);
assert.match(page, /href="\/#contact"/);
assert.match(page, /aria-label="Breadcrumb"/);
assert.match(page, /<li><a href="\/">Home<\/a><\/li>\s*<li aria-current="page">Website Development<\/li>/);

/* Root-relative shared assets; homepage-only scripts must not load here */
assert.match(page, /<link rel="stylesheet" href="\/styles\.css" \/>/);
assert.match(page, /<link rel="stylesheet" href="\/faq\.css" \/>/);
assert.match(page, /<link rel="stylesheet" href="\/website-development\/service\.css" \/>/);
assert.match(page, /<script src="\/faq\.js"><\/script>/);
assert.match(page, /<script src="\/website-development\/service\.js"><\/script>/);
for (const banned of ['intro.js', 'script.js', 'circular-nav.js', 'content-config.js', 'portfolio-content.js', 'testimonial-cards.js']) {
  assert.ok(!page.includes('src="' + banned + '"'), 'service page must not load ' + banned);
}
assert.ok(!page.includes('intro-overlay'), 'no scroll-to-open introduction on this page');

/* Images: dimensions, alt text, eager hero, lazy below-fold builds */
for (const match of page.matchAll(/<img\b([^>]*)>/g)) {
  const tag = match[1];
  assert.match(tag, /alt="[^"]+"/, 'every image has alt text: ' + tag.slice(0, 80));
  assert.match(tag, /width="\d+"/);
  assert.match(tag, /height="\d+"/);
}
const heroImg = page.match(/<img src="\/assets\/work-anaya\.jpg"[^>]*>/)[0];
assert.ok(!/loading="lazy"/.test(heroImg), 'the primary hero image is not lazy-loaded');
assert.match(heroImg, /fetchpriority="high"/);
assert.match(page, /<img src="\/assets\/work-shakti\.jpg"[^>]*loading="lazy"/, 'build images are lazy');

/* Enquiry form */
assert.match(page, /action="https:\/\/formspree\.io\/f\/xzezwkeq" method="post"/);
assert.match(page, /name="subject" value="Website Development enquiry from \{\{ name \}\}"/);
assert.match(page, /name="source" value="Website Development service page"/);
assert.match(page, /name="_gotcha"/);
for (const id of ['wd-name', 'wd-email', 'wd-message']) {
  assert.match(page, new RegExp('<label for="' + id + '"'), 'label for ' + id);
}
assert.match(page, /id="wd-name" name="name"[^>]*required/);
assert.match(page, /id="wd-email" name="email"[^>]*required/);
assert.match(page, /id="wd-message" name="message"[^>]*required/);
assert.ok(!/id="wd-business" name="business"[^>]*required/.test(page), 'business name is optional');
assert.ok(!/id="wd-url" name="website_url"[^>]*required/.test(page), 'current website is optional');
assert.ok(!page.includes('type="tel"'), 'no phone number field');
assert.match(page, /id="wdStatus" role="status" aria-live="polite"/);
assert.match(page, /https:\/\/wa\.me\/919638902001\?text=Hi%20Yatharth%2C%20I%27m%20interested%20in%20a%20website%20for%20my%20business\./);
assert.match(page, /https:\/\/www\.instagram\.com\/scaleup\.biz\.in\//);

/* External links carry rel=noopener */
for (const match of page.matchAll(/<a\b[^>]*href="(https?:[^"]*)"[^>]*>/g)) {
  assert.match(match[0], /rel="noopener noreferrer"/, 'external link is sandboxed: ' + match[1]);
}

/* FAQ answers live in the HTML, not behind a fetch */
assert.equal((page.match(/class="faq-item"/g) || []).length, 8, 'eight FAQ items');
assert.ok(!page.includes('fetch('), 'the page itself performs no fetches');
assert.match(page, /class="faq-panel" id="wd-faq-panel-1" role="region"/, 'FAQ panels are regions, expanded in source HTML');
assert.ok(!/class="faq-panel[^>]*\shidden/.test(page), 'panels are not hidden in the delivered HTML');
assert.match(css, /html:not\(\.wd-js\) \.faq-panel \{ grid-template-rows: 1fr; \}/, 'answers remain readable without JavaScript');
assert.match(css, /html:not\(\.wd-js\) \.faq-answer > \* \{ opacity: 1/, 'the stagger cannot hide answers when JavaScript is off');
assert.match(page, /document\.documentElement\.classList\.add\("wd-js"\)/, 'a one-line script marks JS availability');

/* Branding: the approved SB mark, not the older violet wordmark tile */
assert.equal((page.match(/<img src="\/branding\/scaleupbiz-mark\.png"/g) || []).length, 2, 'header and footer use the approved mark');
assert.ok(!page.includes('scaleupbiz-logo.svg'), 'the older violet logo SVG is not referenced');

/* No reply-time promises */
assert.ok(!/within a day/i.test(page), 'the page makes no reply-time promise');
assert.ok(!/within a day/i.test(js), 'the confirmation makes no reply-time promise');
assert.match(js, /I’ll reply by email\./, 'confirmation keeps a plain reply expectation');

/* Structured data */
const ldMatch = page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const graph = JSON.parse(ldMatch[1])['@graph'];
const types = graph.map((n) => n['@type']);
for (const type of ['Organization', 'Person', 'WebSite', 'WebPage', 'Service', 'BreadcrumbList']) {
  assert.ok(types.includes(type), 'JSON-LD includes ' + type);
}
const service = graph.find((n) => n['@type'] === 'Service');
assert.equal(service.provider['@id'], 'https://scaleupbiz.co.in/#organization', 'Service provider references the existing Organization');
const breadcrumb = graph.find((n) => n['@type'] === 'BreadcrumbList');
assert.equal(breadcrumb.itemListElement.length, 2);
assert.equal(breadcrumb.itemListElement[1].item, 'https://scaleupbiz.co.in/website-development/');
assert.ok(!JSON.stringify(graph).includes('aggregateRating'), 'no invented ratings');
assert.ok(!JSON.stringify(graph).includes('"price"'), 'no invented prices');

/* Page CSS is self-contained and motion-safe */
assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'service.css braces balance');
assert.match(css, /@media \(max-width: 900px\)/);
assert.match(css, /@media \(max-width: 640px\)/);

/* Form script */
assert.match(js, /reportValidity/, 'client-side validation runs before sending');
assert.match(js, /sendButton\.disabled = true/, 'duplicate submissions are blocked while sending');
assert.match(js, /Enquiry received/, 'success only after a response');
assert.match(js, /not sent/, 'failure keeps the message on screen');

/* Sitemap and robots */
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.match(sitemap, /<loc>https:\/\/scaleupbiz\.co\.in\/<\/loc>/, 'sitemap retains the homepage');
assert.match(sitemap, /<loc>https:\/\/scaleupbiz\.co\.in\/website-development\/<\/loc>/, 'sitemap includes the new page');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
assert.match(robots, /Sitemap: https:\/\/scaleupbiz\.co\.in\/sitemap\.xml/);

/* Vercel routing: new rewrite added, existing rules untouched */
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const rewrites = vercel.rewrites.map((r) => r.source);
assert.ok(rewrites.includes('/website-development'), 'rewrite for the bare route');
assert.ok(rewrites.includes('/website-development/'), 'rewrite for the trailing-slash route');
assert.ok(rewrites.includes('/admin'), 'admin rewrite preserved');
assert.ok(vercel.redirects.some((r) => r.source === '/index.html'), 'existing redirects preserved');
const adminHeaders = vercel.headers.find((h) => h.source === '/admin');
assert.equal(adminHeaders.headers[0].value, 'noindex, nofollow', 'admin noindex header preserved');

/* Homepage connects to the page and survives its own CMS */
assert.equal((home.match(/href="\/website-development\/"/g) || []).length, 2, 'homepage links from the service card and the footer');
const renderer = fs.readFileSync(path.join(root, 'portfolio-content.js'), 'utf8');
assert.match(renderer, /source_key,sort_order/, 'the CMS query fetches source_key');
assert.match(renderer, /item\.source_key === "websites"/, 'the renderer re-adds the page link for the websites card');

console.log('PASS: service page metadata, structure, form, FAQ fallback, structured data, sitemap, routing, and homepage links.');
