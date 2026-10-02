/* Website Development service page — enquiry form, entrance reveals, year.
   Deliberately standalone: the homepage scripts assume homepage-only
   elements, so they are not loaded on this page. */
(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Entrance reveals reuse the shared .motion-reveal system in styles.css.
     Content is never hidden without JavaScript: the classes are only added here. */
  if (typeof window.IntersectionObserver === "function" &&
      (typeof window.matchMedia !== "function" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (targets.length) {
      var revealObserver = new window.IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
      targets.forEach(function (target, index) {
        target.classList.add("motion-reveal");
        if (index < 4) target.style.setProperty("--reveal-delay", (index * 65) + "ms");
        revealObserver.observe(target);
      });
      document.documentElement.classList.add("motion-ready");
    }
  }

  var form = document.getElementById("wdEnquiryForm");
  var status = document.getElementById("wdStatus");
  var sendButton = document.getElementById("wdSend");
  if (!form || !status || !sendButton) return;

  var requiredFields = ["wd-name", "wd-email", "wd-message"].map(function (id) { return document.getElementById(id); });
  var urlField = document.getElementById("wd-url");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (sendButton.disabled) return;

    requiredFields.forEach(function (field) {
      field.setCustomValidity(field.value.trim() ? "" : "Please complete this field.");
    });
    if (!form.reportValidity()) return;

    sendButton.disabled = true;
    status.classList.remove("is-error", "is-success");
    status.textContent = "Sending your enquiry…";
    try {
      var response = await fetch(form.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      });
      if (!response.ok) throw new Error("Send failed");
      form.reset();
      status.classList.add("is-success");
      status.textContent = "Enquiry received. I’ll reply by email.";
      if (window.ScaleUpAnalytics) window.ScaleUpAnalytics.trackLead("website_development");
    } catch {
      status.classList.add("is-error");
      status.textContent = "Your enquiry was not sent. Your answers are still in the form — please try again, or email me or use WhatsApp instead.";
    } finally {
      sendButton.disabled = false;
    }
  });

  form.addEventListener("input", function (event) {
    if (requiredFields.indexOf(event.target) === -1 && event.target !== urlField) return;
    event.target.setCustomValidity("");
    status.classList.remove("is-error", "is-success");
    status.textContent = "";
  });
})();
