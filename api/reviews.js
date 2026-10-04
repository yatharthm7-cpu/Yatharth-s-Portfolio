"use strict";
// Public review submission endpoint. Receives POST /api/reviews from the website's
// review form, validates the payload server-side, and writes a pending review through
// the Supabase service-role key, which lives only in this function's environment.
// Moderation (approve, reject, unpublish, delete) happens in /admin/ through the
// owner's own authenticated session and row-level security instead.
const SUPABASE_URL = "https://ccttomyjutpppemvtvfk.supabase.co";
const OWNER_REQUIREMENTS = {
  nameMin: 1, nameMax: 80,
  orgMax: 100, projectMax: 100,
  reviewMin: 40, reviewMax: 700,
  emailMax: 254, bodyMaxChars: 10000,
  rateWindowMs: 10 * 60 * 1000, rateMax: 5,
  resendWindowMs: 24 * 60 * 60 * 1000
};
// Submitted content is stored as plain text. Anything that looks like markup or script
// is rejected outright; the website renders reviews through textContent, never HTML.
const CODE_PATTERN = /<\s*\/?\s*[a-z!]|javascript\s*:|data\s*:\s*text\/html|\bon[a-z]{3,}\s*=/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function createHandler({ fetcher = fetch, env = process.env, now = Date.now } = {}) {
  let rateBuckets = new Map();
  // Supabase's current sb_secret_ keys replace the legacy service_role JWT. Keep
  // the fallback so existing deployments continue working during migration.
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  // Detect the credential format rather than trusting the environment-variable name:
  // this also survives a value being placed under the old name during migration.
  const isLegacyServiceRole = Boolean(supabaseKey && !String(supabaseKey).startsWith("sb_secret_"));

  function fail(status, code, fields) {
    const error = new Error(code);
    error.status = status;
    error.code = code;
    if (fields) error.fields = fields;
    return error;
  }
  function jsonError(error) {
    const body = { error: error.code || "review_unavailable" };
    if (error.fields) body.fields = error.fields;
    return body;
  }
  // PostgREST filters are the parameter binding: values travel as encoded query
  // parameters and are parsed by the database, never concatenated into SQL.
  async function supabase(path, options) {
    const response = await fetcher(SUPABASE_URL + path, {
      ...options,
      signal: AbortSignal.timeout(10000),
      headers: {
        apikey: supabaseKey,
        ...(isLegacyServiceRole ? { Authorization: "Bearer " + supabaseKey } : {}),
        "Content-Type": "application/json",
        ...(options && options.headers)
      }
    });
    if (!response.ok) {
      console.warn("reviews_upstream_failed", { status: response.status, step: path.split("?")[0] });
      throw fail(response.status >= 500 ? 503 : 502, "review_service_unavailable");
    }
    return response;
  }
  function cleanLine(value) {
    return String(value || "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function cleanReview(value) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  function rateLimited(ip, time) {
    const cutoff = time - OWNER_REQUIREMENTS.rateWindowMs;
    const recent = (rateBuckets.get(ip) || []).filter(stamp => stamp >= cutoff);
    if (recent.length >= OWNER_REQUIREMENTS.rateMax) return true;
    recent.push(time);
    rateBuckets.set(ip, recent);
    if (rateBuckets.size > 5000) {
      for (const [key, stamps] of rateBuckets) {
        if (!stamps.some(stamp => stamp >= cutoff)) rateBuckets.delete(key);
      }
    }
    return false;
  }
  async function verifyTurnstile(token, ip) {
    const secret = env.TURNSTILE_SECRET_KEY;
    if (!secret) return; // Protection prepared but not enabled; honeypot and limits still apply.
    if (!token || typeof token !== "string" || token.length > 4096) throw fail(403, "turnstile_failed");
    let data;
    try {
      const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
        signal: AbortSignal.timeout(10000)
      });
      data = await response.json();
    } catch (_) {
      throw fail(503, "turnstile_unavailable");
    }
    if (!data || data.success !== true) throw fail(403, "turnstile_failed");
  }
  function validate(payload) {
    const fields = {};
    const rating = payload.rating;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fields.rating = "Choose a rating from 1 to 5 stars.";
    const clientName = cleanLine(payload.client_name);
    if (clientName.length < OWNER_REQUIREMENTS.nameMin || clientName.length > OWNER_REQUIREMENTS.nameMax) {
      fields.client_name = "Enter your name (up to 80 characters).";
    }
    const businessName = cleanLine(payload.business_name);
    if (businessName.length > OWNER_REQUIREMENTS.orgMax) fields.business_name = "Keep the business name under 100 characters.";
    const projectName = cleanLine(payload.project_name);
    if (projectName.length > OWNER_REQUIREMENTS.projectMax) fields.project_name = "Keep the project name under 100 characters.";
    const reviewText = cleanReview(payload.review_text);
    if (reviewText.length < OWNER_REQUIREMENTS.reviewMin || reviewText.length > OWNER_REQUIREMENTS.reviewMax) {
      fields.review_text = "Write between 40 and 700 characters.";
    }
    const clientEmail = cleanLine(payload.client_email).toLowerCase();
    if (!clientEmail || clientEmail.length > OWNER_REQUIREMENTS.emailMax || !EMAIL_PATTERN.test(clientEmail)) {
      fields.client_email = "Enter a valid email address so the review can be verified.";
    }
    if (payload.consent_to_publish !== true) {
      fields.consent_to_publish = "Permission to display the review is required.";
    }
    for (const value of [clientName, businessName, projectName, reviewText]) {
      if (CODE_PATTERN.test(value)) {
        fields.review_text = fields.review_text || "Remove HTML or code; plain text only.";
      }
    }
    if (Object.keys(fields).length) throw fail(422, "validation_failed", fields);
    return {
      client_name: clientName,
      business_name: businessName || null,
      project_name: projectName || null,
      rating,
      review_text: reviewText,
      client_email: clientEmail,
      consent_to_publish: true,
      status: "pending"
    };
  }
  async function findExisting(clientEmail, reviewText) {
    const query = "/rest/v1/reviews?select=client_email,review_text,status,created_at&client_email=eq."
      + encodeURIComponent(clientEmail) + "&order=created_at.desc&limit=20";
    const response = await supabase(query, { method: "GET" });
    let rows;
    try { rows = await response.json(); } catch (_) { throw fail(502, "review_service_unavailable"); }
    if (!Array.isArray(rows)) throw fail(502, "review_service_unavailable");
    return rows;
  }

  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        throw fail(405, "method_not_allowed");
      }
      const contentType = String(req.headers["content-type"] || "");
      if (contentType.indexOf("application/json") !== 0) throw fail(415, "unsupported_media_type");
      const origin = req.headers.origin;
      if (origin) {
        const host = req.headers["x-forwarded-host"] || req.headers.host || "";
        let originHost = "";
        try { originHost = new URL(origin).host; } catch (_) { throw fail(403, "bad_origin"); }
        if (originHost !== host) throw fail(403, "bad_origin");
      }
      let payload = req.body;
      if (typeof payload !== "object" || payload === null) {
        throw fail(400, "invalid_json");
      }
      if (JSON.stringify(payload).length > OWNER_REQUIREMENTS.bodyMaxChars) {
        throw fail(413, "payload_too_large");
      }
      if (!supabaseKey) throw fail(503, "reviews_not_configured");

      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
      if (rateLimited(ip, now())) throw fail(429, "too_many_requests");

      // Honeypot: real visitors never fill this hidden field. Answer like a success
      // so bots learn nothing, and write nothing.
      if (cleanLine(payload.website)) {
        return res.status(201).json({ ok: true, message: "review_submitted" });
      }

      await verifyTurnstile(payload.turnstile_token, ip);
      const review = validate(payload);

      const existing = await findExisting(review.client_email, review.review_text);
      if (existing.some(row => row.status === "pending")) throw fail(409, "review_already_pending");
      if (existing.some(row => row.review_text === review.review_text)) throw fail(409, "review_duplicate");
      const cutoff = now() - OWNER_REQUIREMENTS.resendWindowMs;
      if (existing.some(row => new Date(row.created_at).getTime() >= cutoff)) {
        throw fail(429, "review_recently_submitted");
      }

      await supabase("/rest/v1/reviews", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(review)
      });
      // The response never echoes the email or the review text.
      return res.status(201).json({ ok: true, message: "review_submitted" });
    } catch (error) {
      if (!error.code) {
        console.warn("reviews_request_failed", { kind: error.name === "TimeoutError" ? "timeout" : error.name === "TypeError" ? "network" : "unexpected" });
      }
      return res.status(error.status || 502).json(jsonError(error));
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
