"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createHandler } = require("../api/analytics.js");
const owner = { id: "owner-id", email: "yatharth@scaleupbiz.co.in", email_confirmed_at: "2026-10-02", is_anonymous: false };
function fixture(options = {}) {
  let time = Date.parse("2026-10-02T12:00:00Z"), authCalls = 0, reportCalls = 0, authOptions, oidcVersion = 1, supplied = [];
  const handler = createHandler({
    env: { VERCEL_ENV: options.environment === undefined ? "production" : options.environment },
    now: () => time,
    oidcToken: async () => "test-oidc-" + oidcVersion,
    googleAuth: config => { authOptions = config; return { getAccessToken: async () => { supplied.push(await config.subject_token_supplier.getSubjectToken()); if (options.tokenFailure) throw Error("secret-error"); return { token: options.emptyToken ? null : "test-google-token" }; } }; },
    fetcher: async (url, init) => {
      if (url.endsWith("/auth/v1/user")) {
        authCalls++; assert.equal(init.headers.apikey.startsWith("sb_publishable_"), true);
        return { ok: !options.authStatus, status: options.authStatus || 200, json: async () => options.user || owner };
      }
      reportCalls++;
      assert.equal(url, "https://analyticsdata.googleapis.com/v1beta/properties/557081748:runRealtimeReport");
      assert.equal(init.headers.Authorization, "Bearer test-google-token");
      const body = JSON.parse(init.body);
      assert.equal(body.dimensionFilter.filter.stringFilter.value, "15941294569");
      assert.equal(body.dimensionFilter.filter.stringFilter.matchType, "EXACT");
      const dimension = body.dimensions && body.dimensions[0].name;
      const row = (values, names = []) => ({ dimensionValues: names.map(value => ({ value })), metricValues: values.map(value => ({ value: String(value) })) });
      const rows = dimension === "eventName" ? [row([3], ["generate_lead"]), row([4], ["whatsapp_click"]), row([2], ["email_click"]), row([15], ["page_view"])]
        : dimension === "country" ? [row([7], ["India"])]
        : dimension === "unifiedScreenName" ? [row([9], ["<script>Title</script>"])]
        : body.minuteRanges[0].startMinutesAgo === 4 ? [row([2])] : [row([7, 15])];
      if (options.wait) await options.wait;
      if (options.sparse) return { ok: true, status: 200, json: async () => options.invalidSparse ? {} : { kind: "analyticsData#runRealtimeReport" } };
      return { ok: !options.reportStatus, status: options.reportStatus || 200, json: async () => ({ error: "private-key-secret", metricHeaders: body.metrics.map(metric => ({ name: options.badHeaders ? "wrong" : metric.name })), rows: options.empty ? [] : rows }) };
    }
  });
  async function call(authorization = "Bearer test-session", method = "GET") {
    const result = { headers: {} };
    const res = { setHeader: (key, value) => { result.headers[key] = value; }, status(code) { result.status = code; return this; }, json(data) { result.body = data; return result; } };
    await handler({ method, headers: { authorization }, query: { property: "untrusted" } }, res);
    return result;
  }
  return { call, advance: ms => { time += ms; oidcVersion++; }, counts: () => ({ authCalls, reportCalls }), authOptions: () => authOptions, supplied: () => supplied };
}
async function backend() {
  const noAuth = fixture();
  assert.equal((await noAuth.call("")).status, 401);
  assert.equal((await noAuth.call("Bearer broken token")).status, 401);
  assert.equal((await noAuth.call(undefined, "POST")).status, 405);
  assert.deepEqual(noAuth.counts(), { authCalls: 0, reportCalls: 0 });
  for (const authStatus of [401, 500]) assert.equal((await fixture({ authStatus }).call()).status, authStatus === 401 ? 401 : 503);
  for (const user of [{ ...owner, email: "other@example.com" }, { ...owner, email_confirmed_at: null }, { ...owner, is_anonymous: true }]) {
    const f = fixture({ user }); assert.equal((await f.call()).status, 403); assert.equal(f.counts().reportCalls, 0);
  }
  for (const environment of ["", "preview", "development"]) {
    const result = await fixture({ environment }).call(); assert.equal(result.status, 503); assert.equal(result.body.error, "analytics_setup_required");
  }
  const f = fixture(), result = await f.call();
  assert.equal(result.status, 200);
  assert.equal(result.headers["Cache-Control"], "private, no-store");
  assert.deepEqual([result.body.activeUsers5, result.body.activeUsers30, result.body.pageViews30, result.body.enquiries30, result.body.whatsappClicks30, result.body.emailClicks30], [2, 7, 15, 3, 4, 2]);
  assert.deepEqual(result.body.countries, [{ name: "India", count: 7 }]);
  assert.deepEqual(f.authOptions().scopes, ["https://www.googleapis.com/auth/analytics.readonly"]);
  assert.equal(f.authOptions().type, "external_account");
  assert.equal(f.authOptions().audience, "//iam.googleapis.com/projects/979369476930/locations/global/workloadIdentityPools/scaleupbiz-vercel/providers/vercel");
  assert.equal(f.authOptions().token_url, "https://sts.googleapis.com/v1/token");
  assert.equal(f.authOptions().service_account_impersonation_url, "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/scaleupbiz-analytics-reader@scaleupbiz-analytics.iam.gserviceaccount.com:generateAccessToken");
  assert.equal(f.authOptions().credentials, undefined);
  assert.equal(f.authOptions().credential_source, undefined);
  await f.call(); assert.deepEqual(f.counts(), { authCalls: 2, reportCalls: 5 });
  f.advance(25000); await f.call(); assert.deepEqual(f.counts(), { authCalls: 3, reportCalls: 10 });
  assert.deepEqual(f.supplied(), ["test-oidc-1", "test-oidc-2"], "Refresh must obtain the current runtime identity, rather than a captured token");
  assert.equal((await fixture({ emptyToken: true }).call()).body.error, "analytics_connection_failed");
  let release;
  const concurrent = fixture({ wait: new Promise(resolve => { release = resolve; }) });
  const calls = [concurrent.call(), concurrent.call()]; await new Promise(resolve => setImmediate(resolve)); release();
  await Promise.all(calls); assert.deepEqual(concurrent.counts(), { authCalls: 2, reportCalls: 5 });
  const empty = await fixture({ empty: true }).call(); assert.equal(empty.status, 200); assert.equal(empty.body.pageViews30, 0); assert.deepEqual(empty.body.pages, []);
  const sparse = await fixture({ sparse: true }).call(); assert.equal(sparse.status, 200); assert.equal(sparse.body.activeUsers5, 0); assert.equal(sparse.body.pageViews30, 0); assert.deepEqual(sparse.body.pages, []);
  assert.equal((await fixture({ sparse: true, invalidSparse: true }).call()).status, 502, "An unidentified empty response must not become invented zero counts");
  for (const [options, status, code] of [[{ reportStatus: 403 }, 503, "analytics_access_required"], [{ reportStatus: 429 }, 429, "analytics_rate_limited"], [{ reportStatus: 500 }, 502, "analytics_unavailable"], [{ badHeaders: true }, 502, "analytics_unavailable"], [{ tokenFailure: true }, 503, "analytics_connection_failed"]]) {
    const r = await fixture(options).call(); assert.equal(r.status, status); assert.deepEqual(r.body, { error: code }); assert.equal(JSON.stringify(r).includes("secret"), false);
  }
  // Owner authorization must happen even after a report has entered the cache.
  const mutable = { user: owner }, cached = fixture(mutable);
  assert.equal((await cached.call()).status, 200);
  mutable.user = { ...owner, email: "other@example.com" };
  assert.equal((await cached.call()).status, 403);
  assert.deepEqual(cached.counts(), { authCalls: 2, reportCalls: 5 });
  console.log("PASS: private report authentication, scope, fixed stream, counts, cache, concurrency and failures");
}
function browserFixture() {
  class Element {
    constructor() { this.textContent = ""; this.children = []; this.dataset = {}; this.events = {}; this.checked = true; this.hidden = true; }
    setAttribute(key, value) { this[key] = value; }
    replaceChildren() { this.children = []; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, fn) { this.events[name] = fn; }
  }
  const elements = {}, timers = new Map(); let counter = 0, requests = 0, next = null, token = "test-session";
  const document = { hidden: false, events: {}, getElementById: id => elements[id] ||= new Element(), createElement: () => new Element(), addEventListener(name, fn) { this.events[name] = fn; } };
  const context = { window: {}, document, AbortController, Date, Number, fetch: async (url, init) => { requests++; assert.equal(url, "/api/analytics"); assert.equal(init.headers.Authorization, "Bearer test-session"); return next; }, setTimeout: (fn, ms) => { const id = ++counter; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(fs.readFileSync(require.resolve("../admin/live-tracking.js"), "utf8"), context);
  const tracking = context.window.createLiveTracking({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } });
  return { elements, document, timers, tracking, count: () => requests, setNext: result => { next = result; }, noToken: () => { token = null; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function frontend() {
  const report = (overrides = {}) => ({ ok: true, json: async () => ({ updatedAt: "2026-10-02T12:00:00Z", activeUsers5: 2, activeUsers30: 7, pageViews30: 15, enquiries30: 3, whatsappClicks30: 4, emailClicks30: 2, pages: [{ name: "<img onerror=bad>", count: 9 }], countries: [], ...overrides }) });
  const f = browserFixture(); f.setNext(report()); f.tracking.start(); await tick();
  assert.equal(f.elements.liveTracking.dataset.state, "connected");
  assert.equal(f.elements["tracking-activeUsers5"].textContent, "2");
  assert.equal(f.elements.trackingPages.children[0].children[0].textContent, "<img onerror=bad>");
  assert.equal([...f.timers.values()].filter(t => t.ms === 30000).length, 1);
  f.tracking.start(); await tick(); assert.equal(f.count(), 1);
  f.document.hidden = true; f.document.events.visibilitychange(); assert.equal(f.timers.size, 0);
  f.document.hidden = false; f.document.events.visibilitychange(); await tick(); assert.equal(f.count(), 2);
  f.elements.trackingAuto.checked = false; f.elements.trackingAuto.events.change(); assert.equal(f.timers.size, 0);
  f.setNext({ ok: false, json: async () => ({ error: "analytics_unavailable" }) }); f.elements.trackingRefresh.events.click(); await tick();
  assert.equal(f.elements.liveTracking.dataset.state, "error"); assert.equal(f.elements["tracking-activeUsers5"].textContent, "2");
  f.tracking.stop(); assert.equal(f.elements["tracking-activeUsers5"].textContent, "—"); assert.equal(f.timers.size, 0);
  f.elements.trackingRefresh.events.click(); await tick(); assert.equal(f.count(), 3);
  const missing = browserFixture(); missing.setNext({ ok: false, json: async () => ({ error: "analytics_setup_required" }) }); missing.tracking.start(); await tick();
  assert.equal(missing.elements.trackingSetup.hidden, false); assert.equal(missing.elements.trackingAuto.checked, false); assert.equal(missing.elements["tracking-activeUsers5"].textContent, "—"); assert.equal(missing.timers.size, 0);
  const expired = browserFixture(); expired.noToken(); expired.tracking.start(); await tick(); assert.equal(expired.count(), 0); assert.equal(expired.timers.size, 0);
  let resolve;
  const late = browserFixture(); late.setNext(new Promise(r => { resolve = r; })); late.tracking.start(); await tick(); late.tracking.stop(); resolve(report()); await tick();
  assert.equal(late.elements.liveTracking.dataset.state, "idle"); assert.equal(late.elements["tracking-activeUsers5"].textContent, "—"); assert.equal(late.timers.size, 0);
  const invalid = browserFixture(); invalid.setNext(report({ pages: [{ name: "bad", count: -1 }] })); invalid.tracking.start(); await tick(); assert.equal(invalid.elements.liveTracking.dataset.state, "error"); assert.equal(invalid.elements["tracking-activeUsers5"].textContent, "—");
  console.log("PASS: dashboard polling, hidden-tab pause, manual refresh, setup errors, session loss, late responses and safe labels");
}
(async () => { await backend(); await frontend(); })().catch(error => { console.error(error); process.exitCode = 1; });
