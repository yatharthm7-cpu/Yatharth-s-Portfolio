/* Yatharth Mehta — navigation and an explicit email-app handoff. */
(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function closeNav() {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && links.classList.contains("open")) {
      closeNav();
      toggle.focus();
    }
  });
  document.addEventListener("click", function (event) {
    if (!links.contains(event.target) && !toggle.contains(event.target)) closeNav();
  });
  document.addEventListener("focusin", function (event) {
    if (!links.contains(event.target) && !toggle.contains(event.target)) closeNav();
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 860) closeNav();
  });

  // Native anchors keep URL/history semantics; focus follows keyboard navigation.
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (anchor) {
    anchor.addEventListener("click", function () {
      var target = document.querySelector(anchor.getAttribute("href"));
      if (!target) return;
      closeNav();
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]'));
  function highlightNav() {
    var current = null;
    navAnchors.forEach(function (anchor) {
      var section = document.querySelector(anchor.getAttribute("href"));
      if (section && section.getBoundingClientRect().top <= 180) current = anchor;
    });
    navAnchors.forEach(function (anchor) {
      var active = anchor === current;
      anchor.classList.toggle("active", active);
      if (active) anchor.setAttribute("aria-current", "location");
      else anchor.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", highlightNav, { passive: true });
  window.addEventListener("resize", highlightNav);
  highlightNav();

  var form = document.getElementById("contactForm");
  var foot = document.getElementById("formFoot");
  var fallback = document.getElementById("emailFallback");
  var fields = ["name", "email", "message"].map(function (id) { return document.getElementById(id); });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    fields.forEach(function (field) {
      field.setCustomValidity(field.value.trim() ? "" : "Please complete this field.");
    });
    if (!form.reportValidity()) return;

    var name = fields[0].value.trim();
    var email = fields[1].value.trim();
    var message = fields[2].value.trim();
    var subject = encodeURIComponent("Portfolio enquiry from " + name);
    var body = encodeURIComponent(message + "\n\nFrom: " + name + "\nEmail: " + email);
    var draftUrl = "mailto:yatharthm7@gmail.com?subject=" + subject + "&body=" + body;
    fallback.href = draftUrl;
    fallback.textContent = "Open this email draft";
    foot.textContent = "Your email app should open with a draft. Review and send it there. Nothing has been sent by this website.";
    // A mailto link only hands off a draft; it cannot confirm delivery.
    window.location.href = draftUrl;
  });

  form.addEventListener("input", function (event) {
    if (fields.indexOf(event.target) === -1) return;
    event.target.setCustomValidity("");
    foot.textContent = "";
    fallback.href = "mailto:yatharthm7@gmail.com";
    fallback.textContent = "Email me";
  });
})();
