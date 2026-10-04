"use strict";
const { ExternalAccountClient } = require("google-auth-library");
const { getVercelOidcToken } = require("@vercel/oidc");
const PROPERTY_ID = "557081748";
const STREAM_ID = "15941294569";
const OWNER_EMAIL = "yatharth@scaleupbiz.co.in";
const SUPABASE_URL = "https://ccttomyjutpppemvtvfk.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_HG19YDyxFlHtmK9brGlV1Q_2kJHRLs1";
const FEDERATION_AUDIENCE = "//iam.googleapis.com/projects/979369476930/locations/global/workloadIdentityPools/scaleupbiz-vercel/providers/vercel";
const READER_EMAIL = "scaleupbiz-analytics-reader@scaleupbiz-analytics.iam.gserviceaccount.com";

function createHandler({ fetcher = fetch, env = process.env, now = Date.now, googleAuth = options => ExternalAccountClient.fromJSON(options), oidcToken = getVercelOidcToken } = {}) {
  let auth, cached, pending;
  function fail(status, code) { return Object.assign(new Error(code), { status, code }); }
  async function jsonRequest(url, options) {
    const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(10000) });
    let data;
    try { data = await response.json(); } catch (_) { throw fail(502, "analytics_unavailable"); }
    return { response, data };
  }
  async function readReport() {
    if (env.VERCEL_ENV !== "production") throw fail(503, "analytics_setup_required");
    if (!auth) {
      // Fixed, non-secret federation config. Google trusts only this production deployment.
      auth = googleAuth({
        type: "external_account",
        audience: FEDERATION_AUDIENCE,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: "https://sts.googleapis.com/v1/token",
        service_account_impersonation_url: "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" + READER_EMAIL + ":generateAccessToken",
        // Obtain the current runtime token whenever Google needs to refresh access.
        subject_token_supplier: { getSubjectToken: () => oidcToken() },
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"]
      });
    }
    let accessToken;
    try { accessToken = (await auth.getAccessToken()).token; } catch (_) { auth = undefined; throw fail(503, "analytics_connection_failed"); }
    if (typeof accessToken !== "string" || !accessToken) throw fail(503, "analytics_connection_failed");
    const url = "https://analyticsdata.googleapis.com/v1beta/properties/" + PROPERTY_ID + ":runRealtimeReport";
    async function report(body) {
      const { response, data } = await jsonRequest(url, {
        method: "POST", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
          dimensionFilter: { filter: { fieldName: "streamId", stringFilter: { value: STREAM_ID, matchType: "EXACT" } } },
          ...body
        })
      });
      if (!response.ok) {
        console.warn("analytics_report_failed", { status: response.status, report: body.dimensions?.[0]?.name || "totals" });
        if (response.status === 403) throw fail(503, "analytics_access_required");
        if (response.status === 429) throw fail(429, "analytics_rate_limited");
        throw fail(502, "analytics_unavailable");
      }
      // An empty protobuf response may omit repeated headers/rows. Only accept
      // that sparse shape when Google's report kind identifies a real report.
      if (data.kind === "analyticsData#runRealtimeReport" && !data.error && (data.rowCount === undefined || data.rowCount === 0) && (data.rows === undefined || Array.isArray(data.rows) && data.rows.length === 0) && (data.metricHeaders === undefined || Array.isArray(data.metricHeaders) && data.metricHeaders.length === 0)) return data;
      if (!Array.isArray(data.metricHeaders) || data.metricHeaders.length !== body.metrics.length || data.metricHeaders.some((header, index) => header.name !== body.metrics[index].name) || (data.rows !== undefined && !Array.isArray(data.rows))) {
        console.warn("analytics_report_schema_failed", { report: body.dimensions?.[0]?.name || "totals" });
        throw fail(502, "analytics_unavailable");
      }
      return data;
    }
    const reports = await Promise.all([
      report({ metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }] }),
      report({ metrics: [{ name: "activeUsers" }], minuteRanges: [{ startMinutesAgo: 4, endMinutesAgo: 0 }] }),
      report({ dimensions: [{ name: "unifiedScreenName" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: "8" }),
      report({ dimensions: [{ name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: "6" }),
      report({ dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], limit: "100" })
    ]);
    function number(row, index = 0) {
      const value = Number(row && row.metricValues && row.metricValues[index] && row.metricValues[index].value || 0);
      if (!Number.isFinite(value) || value < 0) throw fail(502, "analytics_unavailable");
      return value;
    }
    function list(report) {
      return (report.rows || []).map(row => ({ name: String(row.dimensionValues && row.dimensionValues[0] && row.dimensionValues[0].value || "Unknown").slice(0, 160), count: number(row) }));
    }
    const events = Object.fromEntries(list(reports[4]).map(row => [row.name, row.count]));
    return {
      updatedAt: new Date(now()).toISOString(),
      activeUsers5: number(reports[1].rows && reports[1].rows[0]),
      activeUsers30: number(reports[0].rows && reports[0].rows[0]),
      pageViews30: number(reports[0].rows && reports[0].rows[0], 1),
      enquiries30: events.generate_lead || 0,
      whatsappClicks30: events.whatsapp_click || 0,
      emailClicks30: events.email_click || 0,
      pages: list(reports[2]), countries: list(reports[3])
    };
  }
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "method_not_allowed" }); }
    const authorization = req.headers.authorization || "";
    if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 8192) return res.status(401).json({ error: "sign_in_required" });
    try {
      // Verify the session with Auth before reading cached or new reports.
      const { response, data: user } = await jsonRequest(SUPABASE_URL + "/auth/v1/user", {
        headers: { apikey: PUBLISHABLE_KEY, Authorization: authorization }
      });
      if (!response.ok) {
        if (response.status >= 500) throw fail(503, "auth_unavailable");
        return res.status(401).json({ error: "sign_in_required" });
      }
      if (!user.id || user.is_anonymous || !user.email_confirmed_at || String(user.email || "").toLowerCase() !== OWNER_EMAIL) return res.status(403).json({ error: "owner_only" });
      if (!cached || now() - cached.at >= 25000) {
        if (!pending) pending = readReport().then(data => { cached = { at: now(), data }; return data; }).finally(() => { pending = undefined; });
        await pending;
      }
      return res.status(200).json(cached.data);
    } catch (error) {
      if (!error.code) console.warn("analytics_request_failed", { kind: error.name === "TimeoutError" ? "timeout" : error.name === "TypeError" ? "network" : "unexpected" });
      // Do not expose upstream bodies, credentials or authorization headers.
      return res.status(error.status || 502).json({ error: error.code || "analytics_unavailable" });
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
