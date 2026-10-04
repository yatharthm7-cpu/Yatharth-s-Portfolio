/* Client review system: "Leave a review" dialog, submission to /api/reviews, and
   rendering of approved reviews below the original testimonials. All user content is
   treated as plain text (textContent only); email addresses never reach this script. */
(function () {
  "use strict";

  var config = window.PORTFOLIO_CONTENT_CONFIG;
  function trackEvent(name) {
    if (window.ScaleUpAnalytics && typeof window.ScaleUpAnalytics.track === "function") window.ScaleUpAnalytics.track(name);
  }
  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  /* =========================================================
     Approved reviews — public query, then graceful continuation
     ========================================================= */
  var reviewsWrap = document.getElementById("clientReviews");
  var reviewsGrid = document.getElementById("reviewsGrid");
  var averageEl = document.getElementById("reviewsAverage");

  function initials(name) {
    return String(name || "").trim().split(/\s+/).slice(0, 2).map(function (word) {
      return word.charAt(0).toUpperCase();
    }).join("") || "C";
  }
  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
    } catch (_) {
      return date.getFullYear() + "";
    }
  }
  function renderReview(row) {
    var card = node("figure", "testimonial-card review-card");
    card.setAttribute("data-tilt", "");
    var header = node("div", "testimonial-header");
    header.append(node("span", "testimonial-avatar", initials(row.client_name)));
    var who = node("div");
    who.append(node("span", "testimonial-name", row.client_name));
    var role = [row.business_name, row.project_name].filter(Boolean).join(" · ");
    if (role) who.append(node("span", "testimonial-role", role));
    header.append(who);
    var mark = node("span", "testimonial-quote-mark", "”");
    mark.setAttribute("aria-hidden", "true");
    header.append(mark);

    var stars = node("span", "review-stars");
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", "Rated " + row.rating + " out of 5 stars");
    for (var i = 1; i <= 5; i++) {
      var star = node("span", "star" + (i <= row.rating ? "" : " is-empty"), i <= row.rating ? "★" : "☆");
      star.style.setProperty("--star-index", String(i - 1));
      stars.append(star);
    }

    var quote = node("blockquote", undefined, "“" + row.review_text + "”");
    var caption = node("figcaption");
    if (row.verified_client) caption.append(node("span", "review-verified", "Verified client"));
    else caption.append(node("span", "testimonial-label", "Client feedback"));
    var published = formatDate(row.published_at);
    if (published) caption.append(node("span", "review-date", published));

    card.append(header, stars, quote, caption);
    return card;
  }
  /* An average may only appear once five approved, genuine rated reviews exist. */
  function renderAverage(count, rows) {
    if (!averageEl || count < 5) return;
    var total = rows.reduce(function (sum, row) { return sum + (Number(row.rating) || 0); }, 0);
    var average = Math.round((total / count) * 10) / 10;
    averageEl.replaceChildren(
      node("strong", undefined, average.toFixed(1)),
      document.createTextNode(" average from " + count + " published client reviews")
    );
    averageEl.hidden = false;
  }

  if (config && config.url && config.publishableKey && reviewsWrap && reviewsGrid) {
    /* Returns only approved rows (row-level security) and only public fields
       (column grants exclude the private email address). */
    /* RLS already limits anonymous visitors to approved rows. Do not also filter by
       status here: anon deliberately has no SELECT grant on that private column. */
    var endpoint = config.url.replace(/\/$/, "") + "/rest/v1/reviews?select=client_name,business_name,project_name,rating,review_text,verified_client,published_at,display_order&order=display_order.asc.nullslast,published_at.desc";
    fetch(endpoint, { headers: { apikey: config.publishableKey }, cache: "no-store" })
      .then(function (response) { if (!response.ok) throw new Error("Reviews unavailable"); return response.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) return; /* Nothing approved yet. */
        var fragment = document.createDocumentFragment();
        rows.forEach(function (row) { fragment.append(renderReview(row)); });
        reviewsGrid.append(fragment);
        renderAverage(rows.length, rows);
        reviewsWrap.hidden = false;
        document.dispatchEvent(new CustomEvent("reviews:rendered"));
      })
      .catch(function () { /* Database unreachable: original cards stay, continuation hidden. */ });
  }

  /* =========================================================
     Review dialog
     ========================================================= */
  var modal = document.getElementById("reviewModal");
  var opener = document.getElementById("reviewOpenButton");
  if (!modal || !opener) return;
  var dialog = modal.querySelector(".review-dialog");
  var form = document.getElementById("reviewForm");
  var errorBox = document.getElementById("reviewError");
  var success = document.getElementById("reviewSuccess");
  var submitButton = document.getElementById("reviewSubmit");
  var ratingGroup = document.getElementById("ratingGroup");
  var ratingLive = document.getElementById("ratingLive");
  var reviewText = document.getElementById("reviewText");
  var counter = document.getElementById("reviewCount");
  var turnstileBox = document.getElementById("reviewTurnstile");
  var starLabels = Array.prototype.slice.call(ratingGroup ? ratingGroup.querySelectorAll(".review-star") : []);
  var background = [
    document.querySelector(".navbar"),
    document.getElementById("main"),
    document.querySelector(".footer"),
    document.querySelector(".analytics-choice")
  ].filter(Boolean);
  var lastFocus = null;
  var closeTimer = 0;
  var turnstileToken = "";
  var turnstileStarted = false;
  var counterTimer = 0;
  var submitLabel = submitButton.firstChild;

  errorBox.tabIndex = -1;

  function checkedValue() {
    var checked = form.querySelector('input[name="rating"]:checked');
    return checked ? Number(checked.value) : 0;
  }
  function lightStars(upTo) {
    starLabels.forEach(function (label, index) { label.classList.toggle("is-lit", index < upTo); });
  }
  if (ratingGroup) {
    ratingGroup.addEventListener("change", function (event) {
      if (event.target.name !== "rating") return;
      var value = Number(event.target.value);
      lightStars(value);
      ratingLive.textContent = value + (value === 1 ? " star selected" : " stars selected");
    });
    ratingGroup.addEventListener("focusin", function (event) {
      if (event.target.name === "rating") lightStars(Number(event.target.value));
    });
    ratingGroup.addEventListener("focusout", function () { lightStars(checkedValue()); });
  }

  if (reviewText && counter) {
    reviewText.addEventListener("input", function () {
      var length = reviewText.value.length;
      counter.textContent = length + " of 700";
      counter.classList.toggle("is-short", length > 0 && length < 40);
      counter.classList.toggle("is-ok", length >= 40);
      clearTimeout(counterTimer);
      counterTimer = setTimeout(function () {
        counter.textContent = length + (length === 1 ? " character" : " characters") + " of 700" + (length < 40 ? " — at least 40 needed" : "");
      }, 900);
    });
  }

  /* Cloudflare Turnstile is prepared but optional: render only when a public site key
     is configured, and send the token for the server to verify against its secret. */
  function initTurnstile() {
    if (turnstileStarted || !config || !config.turnstileSiteKey || !turnstileBox) return;
    turnstileStarted = true;
    turnstileBox.hidden = false;
    var script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = function () {
      if (!window.turnstile || !window.turnstile.render) return;
      window.turnstile.render(turnstileBox, {
        sitekey: config.turnstileSiteKey,
        theme: "dark",
        callback: function (token) { turnstileToken = token; },
        "expired-callback": function () { turnstileToken = ""; },
        "error-callback": function () { turnstileToken = ""; }
      });
    };
    document.head.appendChild(script);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.focus();
  }
  function statusMessage(status, data) {
    if (data && data.fields) {
      var messages = Object.keys(data.fields).map(function (key) { return data.fields[key]; });
      if (messages.length) return messages.join(" ");
    }
    var byCode = {
      409: "A review from this email is already waiting for verification, or this exact review was already submitted.",
      429: "This email or connection has submitted recently. Please try again later.",
      403: "The spam check did not pass. Please reload the page and try again.",
      503: "The review service is temporarily unavailable. Please try again in a moment.",
      502: "The review service is temporarily unavailable. Please try again in a moment."
    };
    return byCode[status] || "Your review was not sent. Please try again, or email yatharth@scaleupbiz.co.in.";
  }

  function openModal() {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    clearTimeout(closeTimer);
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.classList.add("review-modal-open");
    background.forEach(function (element) { element.inert = true; });
    initTurnstile();
    trackEvent("review_form_open");
    var firstRadio = ratingGroup && ratingGroup.querySelector('input[name="rating"]');
    if (firstRadio) firstRadio.focus();
    else dialog.focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("review-modal-open");
    background.forEach(function (element) { element.inert = false; });
    closeTimer = setTimeout(function () {
      modal.hidden = true;
      if (!success.hidden) {
        /* Reset quietly so the next visit starts from a clean form. */
        success.hidden = true;
        form.hidden = false;
        form.reset();
        lightStars(0);
        ratingLive.textContent = "";
        counter.textContent = "0 of 700";
        counter.classList.remove("is-short", "is-ok");
        turnstileToken = "";
      }
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      else opener.focus();
    }, 280);
  }

  opener.addEventListener("click", openModal);
  modal.addEventListener("click", function (event) {
    if (event.target.closest("[data-review-close]")) closeModal();
  });
  dialog.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeModal(); return; }
    if (event.key !== "Tab" || modal.hidden) return;
    var focusable = Array.prototype.filter.call(
      dialog.querySelectorAll("button, input, textarea, select, a[href], [tabindex]:not([tabindex='-1'])"),
      function (element) {
        return !element.disabled && element.tabIndex >= 0 && (element.offsetWidth > 0 || element.offsetHeight > 0);
      }
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitButton.disabled) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
    var rating = checkedValue();
    if (!rating) { showError("Choose a rating from 1 to 5 stars."); return; }
    if (!form.reportValidity()) return;
    var payload = {
      rating: rating,
      client_name: document.getElementById("reviewName").value.trim(),
      business_name: document.getElementById("reviewBusiness").value.trim(),
      project_name: document.getElementById("reviewProject").value.trim(),
      review_text: reviewText.value.trim(),
      client_email: document.getElementById("reviewEmail").value.trim(),
      consent_to_publish: document.getElementById("reviewConsent").checked,
      website: document.getElementById("reviewWebsite").value
    };
    if (turnstileToken) payload.turnstile_token = turnstileToken;

    submitButton.disabled = true;
    if (submitLabel) submitLabel.nodeValue = "Sending… ";
    try {
      var response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var data = null;
      try { data = await response.json(); } catch (_) { /* non-JSON error body */ }
      if (response.ok) {
        form.hidden = true;
        success.hidden = false;
        success.querySelector("button").focus();
        trackEvent("review_submit_success");
        return;
      }
      trackEvent("review_submit_failure");
      showError(statusMessage(response.status, data));
    } catch (_) {
      trackEvent("review_submit_failure");
      showError("Your review was not sent. Please check your connection and try again — your text is still here.");
    } finally {
      submitButton.disabled = false;
      if (submitLabel) submitLabel.nodeValue = "Submit review ";
    }
  });
})();
