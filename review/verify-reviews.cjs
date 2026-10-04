/* Verification for the client-review workflow: submission endpoint behaviour, the SQL
   migration's privacy guarantees, and the page/admin wiring. Run: node review/verify-reviews.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

/* ---------- API behaviour ---------- */
const { createHandler } = require(path.join(root, "api", "reviews.js"));
const NOW = 1759500000000;

function makeFetcher({ existingRows = [], insertFails = false, upstreamStatus = 0 } = {}) {
  const calls = { requests: [], inserted: null };
  const fetcher = async function (url, options = {}) {
    calls.requests.push({ url: String(url), method: options.method || "GET", headers: options.headers || {} });
    if (upstreamStatus && String(url).includes("/rest/v1/reviews")) {
      return { ok: false, status: upstreamStatus, json: async () => ({}) };
    }
    if (String(url).includes("/rest/v1/reviews") && (options.method || "GET") === "GET") {
      return { ok: true, status: 200, json: async () => existingRows };
    }
    if (String(url).includes("/rest/v1/reviews") && options.method === "POST") {
      if (insertFails) return { ok: false, status: 500, json: async () => ({ message: "boom" }) };
      calls.inserted = JSON.parse(options.body);
      return { ok: true, status: 201, json: async () => ({}) };
    }
    if (String(url).includes("turnstile")) {
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  fetcher.calls = calls;
  return fetcher;
}
function makeRes() {
  const res = {
    statusCode: 0, body: null, headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return res;
}
function request(payload, { method = "POST", headers = {} } = {}) {
  return {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", ...headers },
    body: payload
  };
}
function validPayload(overrides = {}) {
  return Object.assign({
    rating: 4,
    client_name: "A. Sharma",
    business_name: "Anaya's Kitchen",
    project_name: "Website Development",
    review_text: "The website finally matches the kitchen and our orders are simpler now.",
    client_email: "Client@Example.com",
    consent_to_publish: true,
    website: ""
  }, overrides);
}
async function submit(overrides, options) {
  const fetcher = makeFetcher(options && options.fetcher);
  const handler = createHandler({
    fetcher,
    env: (options && options.env) || { SUPABASE_SERVICE_ROLE_KEY: "test-service-key" },
    now: () => NOW
  });
  const res = makeRes();
  await handler(request(validPayload(overrides), options), res);
  return { res, fetcher };
}

(async () => {
  /* Success path: pending status, consent enforced, parameterised lookups, no echo. */
  let { res, fetcher } = await submit({});
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ok, true);
  assert.equal(fetcher.calls.inserted.status, "pending", "New submissions must be pending.");
  assert.equal(fetcher.calls.inserted.consent_to_publish, true);
  assert.equal(fetcher.calls.inserted.rating, 4);
  assert.equal(fetcher.calls.inserted.client_email, "client@example.com", "Email is normalised before storage.");
  assert.equal(fetcher.calls.inserted.business_name, "Anaya's Kitchen");
  assert(!JSON.stringify(res.body).includes("client@example.com"), "Response must never echo the email.");
  assert(!JSON.stringify(res.body).includes("Sharma"), "Response must never echo the name.");
  assert(!JSON.stringify(res.body).includes("kitchen"), "Response must never echo the review.");
  const lookup = fetcher.calls.requests.find(call => call.method === "GET" && call.url.includes("client_email=eq."));
  assert(lookup, "Duplicate lookup uses a PostgREST filter (parameter binding), not string SQL.");
  assert(lookup.url.includes(encodeURIComponent("client@example.com")));
  const insert = fetcher.calls.requests.find(call => call.method === "POST");
  assert.equal(insert.url, "https://ccttomyjutpppemvtvfk.supabase.co/rest/v1/reviews");

  /* Current secret keys use the apikey header and do not masquerade as a JWT. */
  ({ res, fetcher } = await submit({}, { env: { SUPABASE_SECRET_KEY: "sb_secret_test" } }));
  assert.equal(res.statusCode, 201);
  const secretRequest = fetcher.calls.requests.find(call => call.url.includes("/rest/v1/reviews"));
  assert.equal(secretRequest.headers.apikey, "sb_secret_test");
  assert.equal(secretRequest.headers.Authorization, undefined);

  /* Key format wins over the variable name during migration. */
  ({ res, fetcher } = await submit({}, { env: { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_saved_under_old_name" } }));
  assert.equal(res.statusCode, 201);
  const migratedRequest = fetcher.calls.requests.find(call => call.url.includes("/rest/v1/reviews"));
  assert.equal(migratedRequest.headers.apikey, "sb_secret_saved_under_old_name");
  assert.equal(migratedRequest.headers.Authorization, undefined);

  /* Safe diagnostic categories identify configuration failures without exposing
     credentials or database response bodies. */
  ({ res } = await submit({}, { fetcher: { upstreamStatus: 401 } }));
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error, "supabase_key_rejected");
  ({ res } = await submit({}, { fetcher: { upstreamStatus: 403 } }));
  assert.equal(res.body.error, "supabase_access_denied");
  ({ res } = await submit({}, { fetcher: { upstreamStatus: 404 } }));
  assert.equal(res.body.error, "reviews_table_unavailable");

  /* Method and shape guards. */
  ({ res } = await submit({}, { method: "GET" }));
  assert.equal(res.statusCode, 405);
  ({ res } = await submit({}, { headers: { "content-type": "text/plain" } }));
  assert.equal(res.statusCode, 415);
  const noBody = createHandler({ fetcher: makeFetcher(), env: { SUPABASE_SERVICE_ROLE_KEY: "k" }, now: () => NOW });
  const noBodyRes = makeRes();
  await noBody({ method: "POST", headers: { "content-type": "application/json" }, body: undefined }, noBodyRes);
  assert.equal(noBodyRes.statusCode, 400);
  const big = makeFetcher();
  const bigHandler = createHandler({ fetcher: big, env: { SUPABASE_SERVICE_ROLE_KEY: "k" }, now: () => NOW });
  const bigRes = makeRes();
  await bigHandler(request({ review_text: "x".repeat(20000) }), bigRes);
  assert.equal(bigRes.statusCode, 413);

  /* Validation boundaries. */
  ({ res } = await submit({ rating: 0 }));
  assert.equal(res.statusCode, 422); assert(res.body.fields.rating);
  ({ res } = await submit({ rating: 6 }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ rating: "4" }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ rating: 4.5 }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ client_name: "" }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ client_name: "x".repeat(81) }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ review_text: "too short" }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ review_text: "x".repeat(701) }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ consent_to_publish: false }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ client_email: "not-an-email" }));
  assert.equal(res.statusCode, 422);
  assert.equal(Object.values(res.body.fields).join(" ").includes("not-an-email"), false, "Field errors never echo input values.");

  /* HTML and script input is rejected. */
  ({ res } = await submit({ review_text: "This site is great <script>alert(1)</script> and I recommend it." }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ client_name: "Bad <img src=x onerror=alert(1)>" }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ client_name: "javascript:alert(1)" }));
  assert.equal(res.statusCode, 422);
  ({ res } = await submit({ review_text: "I <3 this website, it is clear, quick and it brought real orders" }));
  assert.equal(res.statusCode, 201, "Plain text with a heart stays welcome.");

  /* Honeypot: fake success, nothing written. */
  ({ res, fetcher } = await submit({ website: "http://spam.example" }));
  assert.equal(res.statusCode, 201);
  assert.equal(fetcher.calls.inserted, null, "Honeypot submissions must not reach the database.");
  assert.equal(fetcher.calls.requests.filter(call => call.url.includes("/rest/v1/reviews")).length, 0);

  /* Duplicate and rate protections. */
  ({ res } = await submit({}, { fetcher: { existingRows: [{ status: "pending", review_text: "other", created_at: new Date(NOW - 7200000).toISOString() }] } }));
  assert.equal(res.statusCode, 409, "A pending review from the same email blocks a second submission.");
  ({ res } = await submit({ review_text: "Exactly the same words repeated for the duplicate check test case." }, { fetcher: { existingRows: [{ status: "rejected", review_text: "Exactly the same words repeated for the duplicate check test case.", created_at: new Date(NOW - 172800000).toISOString() }] } }));
  assert.equal(res.statusCode, 409, "Identical review text is rejected as a duplicate.");
  ({ res } = await submit({}, { fetcher: { existingRows: [{ status: "approved", review_text: "older different text here entirely", created_at: new Date(NOW - 7200000).toISOString() }] } }));
  assert.equal(res.statusCode, 429, "A same-email submission within 24h is rate limited.");
  ({ res } = await submit({}, { fetcher: { existingRows: [{ status: "rejected", review_text: "older different text here entirely", created_at: new Date(NOW - 90000000).toISOString() }] } }));
  assert.equal(res.statusCode, 201, "After 24h a fresh review is accepted.");

  /* Turnstile: enforced only when its secret is configured. */
  ({ res } = await submit({}, { env: { SUPABASE_SERVICE_ROLE_KEY: "k", TURNSTILE_SECRET_KEY: "secret" } }));
  assert.equal(res.statusCode, 403, "Missing Turnstile token fails closed.");
  ({ res } = await submit({ turnstile_token: "tok" }, { env: { SUPABASE_SERVICE_ROLE_KEY: "k", TURNSTILE_SECRET_KEY: "secret" } }));
  assert.equal(res.statusCode, 201);

  /* Configuration and origin guards. */
  ({ res } = await submit({}, { env: {} }));
  assert.equal(res.statusCode, 503);
  ({ res } = await submit({}, { headers: { origin: "https://evil.example" } }));
  assert.equal(res.statusCode, 403);
  ({ res } = await submit({}, { headers: { origin: "https://scaleupbiz.co.in", "x-forwarded-host": "scaleupbiz.co.in" } }));
  assert.equal(res.statusCode, 201, "Same-origin submissions pass.");

  /* Per-IP rate limit inside one handler instance. */
  const limited = createHandler({ fetcher: makeFetcher(), env: { SUPABASE_SERVICE_ROLE_KEY: "k" }, now: () => NOW });
  let last;
  for (let i = 0; i < 7; i++) {
    const rateRes = makeRes();
    await limited(request(validPayload()), rateRes);
    last = rateRes.statusCode;
  }
  assert.equal(last, 429, "The fifth request in ten minutes from one IP is rate limited.");

  console.log("PASS: /api/reviews validates boundaries, blocks HTML, honeypot, duplicates and spam; stores pending; never echoes private fields.");

  /* ---------- SQL migration ---------- */
  const sql = read("database/portfolio-reviews.sql");
  assert(sql.includes("create table public.reviews"), "Reviews table is created.");
  assert(sql.includes("rating integer not null check (rating between 1 and 5)"));
  assert(sql.includes("check (char_length(client_name) between 1 and 80)"));
  assert(sql.includes("check (char_length(review_text) between 40 and 700)"));
  assert(sql.includes("status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))"));
  assert(sql.includes("check (consent_to_publish = true)"), "Consent is enforced at the database level.");
  assert(sql.includes("published_at timestamptz"));
  assert(sql.includes("alter table public.reviews enable row level security"));
  assert(!/for insert to anon/.test(sql), "Anonymous visitors can never insert reviews directly.");
  assert(sql.includes("status = 'approved' or"), "Public reads return approved rows only.");
  assert(sql.includes("'yatharth@scaleupbiz.co.in'"), "Owner restrictions reuse the existing owner email.");
  const grant = sql.match(/grant select \(([\s\S]*?)\) on public\.reviews to anon/);
  assert(grant, "Column-level grant for anon exists.");
  const granted = grant[1].split(",").map(column => column.trim());
  assert.deepEqual(granted.sort(), ["business_name", "client_name", "display_order", "id", "project_name", "published_at", "rating", "review_text", "verified_client"].sort());
  assert(!granted.includes("client_email"), "The private email is not granted to anon.");
  assert(!granted.includes("status"), "Status is not part of the public field set.");
  assert(sql.includes("create trigger reviews_set_updated_at"));
  assert(sql.includes("grant all on public.reviews to service_role"), "The service role (used only by /api/reviews) can write.");

  console.log("PASS: portfolio-reviews.sql enforces statuses, consent, RLS, owner-only writes, and hides client_email from anon.");

  /* ---------- Public page wiring ---------- */
  const index = read("index.html");
  ["testimonial-shakti", "testimonial-anaya", "testimonial-anoobie"].forEach(id => {
    assert(index.includes(`id="${id}"`), `Existing testimonial ${id} remains untouched.`);
  });
  assert(index.includes('id="reviewOpenButton"') && index.includes("Leave a review"), "The Leave a review button exists.");
  assert(index.includes('aria-controls="reviewModal"') && index.includes('aria-haspopup="dialog"'));
  assert(index.includes('role="dialog"') && index.includes('aria-modal="true"'));
  assert((index.match(/name="rating" value="[1-5]"/g) || []).length === 5, "Five rating radios, none preselected.");
  assert(!/name="rating"[^>]*checked/.test(index), "No default rating.");
  assert(index.includes('maxlength="80"') && index.includes('maxlength="700"') && index.includes('minlength="40"'));
  assert(index.includes("I give ScaleUpBiz permission to display this feedback publicly after verification."), "Consent copy is exact.");
  assert(index.includes('name="website"') && index.includes('tabindex="-1"'), "Honeypot field present.");
  assert(index.includes('id="reviewTurnstile"'), "Turnstile container prepared.");
  assert(index.includes("Thank you. Your review has been submitted for verification. It will not appear publicly until it has been reviewed."), "Exact success copy.");
  assert(index.includes("never shown publicly") || index.includes("never shown publicly and never shared"), "Email privacy is explained.");
  assert(!index.includes("AggregateRating"), "No AggregateRating structured data.");
  const testimonialsSection = index.slice(index.indexOf('id="testimonials"'), index.indexOf('id="faq"'));
  assert(!/google review/i.test(testimonialsSection), "Reviews are never described as Google reviews.");
  assert(index.includes('rel="canonical" href="https://scaleupbiz.co.in/"'), "Canonical URL preserved.");
  assert(index.includes('content="ZaqBhEol44oy0tW9i_Z9EMD44I0Lgd6sWjTZSjjmJ2w"'), "Google verification preserved.");
  assert(index.includes("motion.js") && index.includes("reviews.js") && index.includes("motion.css") && index.includes("reviews.css"));

  /* Public query shape in reviews.js matches the anon grant exactly. */
  const reviewsJs = read("reviews.js");
  const query = reviewsJs.match(/rest\/v1\/reviews\?select=([a-z_,]+)&order=/);
  assert(query, "The public query requests the RLS-filtered public review fields.");
  const fields = query[1].split(",");
  assert.deepEqual(fields.slice().sort(), ["business_name", "client_name", "display_order", "project_name", "published_at", "rating", "review_text", "verified_client"].sort());
  assert(!fields.includes("client_email"), "The public query never selects the email.");
  assert(!reviewsJs.includes("status=eq.approved"), "The anon query relies on RLS and does not filter on the ungranted status column.");
  assert(reviewsJs.includes('website: document.getElementById("reviewWebsite").value'), "The honeypot value reaches the server-side spam check.");
  assert(!reviewsJs.includes("innerHTML"), "User content renders through DOM APIs, never HTML strings.");
  assert(reviewsJs.includes("Verified client") && !reviewsJs.includes('"Verified client" ==='), "Verified badge wording is honest.");
  assert(reviewsJs.includes("count < 5"), "Average rating appears only from five approved reviews.");
  assert(reviewsJs.includes("review_form_open") && reviewsJs.includes("review_submit_success") && reviewsJs.includes("review_submit_failure"), "Privacy-safe analytics events are wired.");
  assert(reviewsJs.includes("Escape") && reviewsJs.includes('"Tab"'), "Dialog supports Escape and a focus trap.");
  assert(reviewsJs.includes("opener.focus()") || reviewsJs.includes("lastFocus.focus()"), "Focus returns to the opening button.");
  assert(reviewsJs.includes('document.querySelector(".analytics-choice")'), "The analytics choice is inert with the modal background.");
  assert(read("reviews.css").includes("body.review-modal-open .analytics-choice"), "The analytics choice cannot overlap the review dialog.");
  assert(reviewsJs.includes('get("review")') && reviewsJs.includes('reviewRequest === "tapvora"'), "Tapvora campaign link opens the review form directly.");
  assert(reviewsJs.includes('projectInput.value = "Tapvora NFC Review Card"'), "Tapvora campaign link pre-fills the reviewed product.");
  assert(reviewsJs.includes("client@example.com") === false);

  const analytics = read("analytics.js");
  assert(analytics.includes("track: track"), "Analytics exposes the review event names.");

  /* ---------- Admin wiring ---------- */
  const adminHtml = read("admin/index.html");
  assert(adminHtml.includes('id="reviewsTab"') && adminHtml.includes('id="reviewsCount"'), "Reviews tab with pending count exists.");
  assert(adminHtml.includes('id="reviewEditEmail"') && /id="reviewEditEmail"[^>]*readonly/.test(adminHtml), "The private email is shown read-only.");
  assert(adminHtml.includes("Approve &amp; publish") && adminHtml.includes("Unpublish") && adminHtml.includes("Delete…"));
  assert(adminHtml.includes("never rewrite the client's meaning"), "The editor warns against rewriting meaning.");
  const adminJs = read("admin/admin.js");
  assert(adminJs.includes('reviewsTab') && adminJs.includes("reviewsPanel"), "admin.js coordinates the fourth tab.");
  const adminReviews = read("admin/reviews.js");
  assert(adminReviews.includes('fields.status = "approved"') && adminReviews.includes("fields.published_at"), "Approving sets status and publication date.");
  assert(adminReviews.includes('status: "pending", published_at: null'), "Unpublishing returns the review to pending.");
  assert(adminReviews.includes("reviewDeleteConfirm"), "Deletion requires explicit confirmation.");
  assert(adminReviews.includes("consent_to_publish"), "Approval requires publication permission.");
  assert(adminReviews.includes("OWNER_EMAIL"), "Moderation is bound to the owner account.");

  console.log("PASS: public page, analytics events and admin moderation are wired correctly.");
})().catch(error => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
