/* Optional GA4 measurement. Contact details and form values never enter events. */
(function () {
  "use strict";
  var id = "G-3SM0E2QYPQ";
  var key = "scaleupbiz.analytics.v1";
  var path = window.location.pathname;
  var publicPage = ["/", "/index.html", "/website-development", "/website-development/", "/privacy.html"].indexOf(path) !== -1;
  if (!publicPage) return;
  var production = window.location.hostname === "scaleupbiz.co.in";
  var choice = "";
  var started = false;
  var previousFocus;
  try { choice = window.localStorage.getItem(key) || ""; } catch (_) {}
  var source = path.indexOf("/website-development") === 0 ? "website_development" : path === "/privacy.html" ? "privacy" : "portfolio";
  var notice = document.createElement("div");
  notice.className = "analytics-choice";
  notice.setAttribute("role", "region");
  notice.setAttribute("aria-label", "Analytics preferences");
  notice.hidden = true;
  notice.innerHTML = '<p><strong>Your analytics choice</strong>Optional analytics helps us understand visits and enquiries. It starts only if you accept. <a href="/privacy.html">Privacy details</a></p><div class="analytics-actions"><button type="button" data-analytics-accept>Accept analytics</button><button type="button" data-analytics-reject>Reject analytics</button></div>';
  document.body.appendChild(notice);
  var accept = notice.querySelector("[data-analytics-accept]");
  var reject = notice.querySelector("[data-analytics-reject]");

  function tag() { window.dataLayer.push(arguments); }
  function start() {
    if (started || !production || choice !== "accepted") return;
    started = true;
    window["ga-disable-" + id] = false;
    window.dataLayer = window.dataLayer || [];
    tag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    tag("js", new Date());
    var referrer = "";
    try { if (document.referrer) referrer = new URL(document.referrer).origin + "/"; } catch (_) {}
    tag("config", id, {
      page_location: window.location.origin + (source === "website_development" ? "/website-development/" : path === "/index.html" ? "/" : path),
      page_referrer: referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(script);
  }
  function track(name, params) {
    if (!started || choice !== "accepted") return;
    try { tag("event", name, params); } catch (_) {}
  }
  function clearCookies() {
    document.cookie.split(";").forEach(function (entry) {
      var name = entry.trim().split("=")[0];
      if (name !== "_ga" && name !== "_ga_3SM0E2QYPQ") return;
      ["", "; domain=scaleupbiz.co.in", "; domain=.scaleupbiz.co.in"].forEach(function (domain) {
        document.cookie = name + "=; Max-Age=0; path=/" + domain + "; SameSite=Lax; Secure";
      });
    });
  }
  function save(value) {
    choice = value;
    try { window.localStorage.setItem(key, value); } catch (_) {}
    notice.hidden = true;
    if (previousFocus) previousFocus.focus();
    if (value === "accepted") start();
    else {
      window["ga-disable-" + id] = true;
      if (started) tag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      clearCookies();
      // A fresh page removes the already-loaded Google library after withdrawal.
      if (started) window.location.reload();
    }
  }
  accept.addEventListener("click", function () { save("accepted"); });
  reject.addEventListener("click", function () { save("rejected"); });
  document.querySelectorAll("[data-analytics-settings]").forEach(function (button) {
    button.addEventListener("click", function () {
      previousFocus = button;
      notice.hidden = false;
      accept.focus();
    });
    button.hidden = false;
  });
  notice.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && choice) { notice.hidden = true; if (previousFocus) previousFocus.focus(); }
  });
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (/^mailto:/i.test(href)) track("email_click", { page_type: source, contact_method: "email" });
    else if (/^https:\/\/wa\.me\//i.test(href)) track("whatsapp_click", { page_type: source, contact_method: "whatsapp" });
  });
  window.ScaleUpAnalytics = {
    trackLead: function (page) {
      if (["portfolio", "website_development"].indexOf(page) !== -1) track("generate_lead", { page_type: page, contact_method: "form" });
    },
    // Named events only (review_form_open, review_submit_success, review_submit_failure).
    // Review text, names and email addresses never enter event parameters.
    track: track
  };
  if (choice === "accepted") start();
  else if (choice !== "rejected") notice.hidden = false;
})();
