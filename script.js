/* Yatharth Mehta — navigation and portfolio interactions. */
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

  // Reveal supporting content once it enters view; never hide content without this observer.
  if (typeof window.IntersectionObserver === "function" &&
      (typeof window.matchMedia !== "function" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var revealTargets = Array.prototype.slice.call(document.querySelectorAll(
      "#work .work-heading, #work .project-card-image, #services .section-head, " +
      "#nfc .nfc-copy h2, #nfc .nfc-stage, #process .section-head, " +
      "#process .process-grid li, #about .about-art, #about .about-copy h2, #contact .contact-card h2"
    ));
    var revealObserver = new window.IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach(function (target) {
      target.classList.add("motion-reveal");
      revealObserver.observe(target);
    });
    document.documentElement.classList.add("motion-ready");
  }

  var nfcStage = document.getElementById("nfcStage");
  var nfcCopy = document.getElementById("nfcJourneyCopy");
  var nfcSteps = Array.prototype.slice.call(document.querySelectorAll("[data-nfc-step]"));
  var nfcDescriptions = {
    "1": "A customer taps the card or scans its QR code with their phone.",
    "2": "The phone opens the destination you have set, such as your Google review page.",
    "3": "The customer can choose whether to leave feedback on that page."
  };
  nfcSteps.forEach(function (button) {
    button.addEventListener("click", function () {
      var step = button.getAttribute("data-nfc-step");
      nfcStage.setAttribute("data-step", step);
      nfcCopy.textContent = nfcDescriptions[step];
      nfcSteps.forEach(function (item) {
        var active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
    });
  });

  if (typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
    var tiltFrame = 0;
    nfcStage.addEventListener("pointermove", function (event) {
      var box = nfcStage.getBoundingClientRect();
      var x = (event.clientX - box.left) / box.width - 0.5;
      var y = (event.clientY - box.top) / box.height - 0.5;
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(function () {
        nfcStage.style.setProperty("--card-tilt-x", (-y * 9).toFixed(2) + "deg");
        nfcStage.style.setProperty("--card-tilt-y", (x * 11).toFixed(2) + "deg");
        tiltFrame = 0;
      });
    });
    nfcStage.addEventListener("pointerleave", function () {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      nfcStage.style.removeProperty("--card-tilt-x");
      nfcStage.style.removeProperty("--card-tilt-y");
    });
  }

})();
