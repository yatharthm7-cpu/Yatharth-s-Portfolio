/* Restrained motion layer: thin scroll-progress indicator, the one-time scroll-to-open
   testimonial reveal, and small pointer tilt on cards. Decorative only: native scrolling
   is untouched, no loops, and reduced-motion visitors receive static content. */
(function () {
  "use strict";

  var reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* --- Thin scroll-progress indicator (informational, so it stays in reduced motion) --- */
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);
  var progressScheduled = false;
  function updateProgress() {
    progressScheduled = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var value = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progress.style.transform = "scaleX(" + value.toFixed(4) + ")";
  }
  window.addEventListener("scroll", function () {
    if (progressScheduled) return;
    progressScheduled = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* --- Scroll-to-open testimonial reveal, once per page load --- */
  var testimonials = document.getElementById("testimonials");
  if (testimonials && !reduceMotion && typeof window.IntersectionObserver === "function") {
    var container = testimonials.querySelector(".container");
    testimonials.classList.add("testimonial-armed");
    Array.prototype.forEach.call(testimonials.querySelectorAll(".testimonial-showcase .testimonial-card"), function (card, index) {
      card.style.setProperty("--card-index", String(index));
    });
    if (container) {
      var frame = document.createElement("div");
      frame.className = "testimonial-frame";
      frame.setAttribute("aria-hidden", "true");
      container.appendChild(frame);
    }
    var openObserver = new window.IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        testimonials.classList.add("is-opened");
        observer.disconnect();
      });
    }, { threshold: 0.15 });
    openObserver.observe(testimonials);
  }

  /* --- Pointer tilt: 2–3 degrees, mouse/pen only, returns smoothly to rest --- */
  var tiltProperties = ["--tilt-x", "--tilt-y", "--avatar-x", "--avatar-y"];
  function bindTilt(element) {
    if (element.__tiltBound || !finePointer || reduceMotion) return;
    element.__tiltBound = true;
    var frameId = 0;
    element.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      var box = element.getBoundingClientRect();
      var x = (event.clientX - box.left) / box.width - 0.5;
      var y = (event.clientY - box.top) / box.height - 0.5;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(function () {
        element.style.setProperty("--tilt-x", (-y * 2.4).toFixed(2) + "deg");
        element.style.setProperty("--tilt-y", (x * 3).toFixed(2) + "deg");
        element.style.setProperty("--avatar-x", (x * 5).toFixed(1) + "px");
        element.style.setProperty("--avatar-y", (y * 5).toFixed(1) + "px");
        frameId = 0;
      });
    });
    element.addEventListener("pointerleave", function () {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      tiltProperties.forEach(function (name) { element.style.removeProperty(name); });
    });
  }
  function bindTiltAll() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-tilt]"), bindTilt);
  }
  window.ScaleUpMotion = { bindTilt: bindTilt };
  bindTiltAll();

  /* Approved review cards render asynchronously: bind tilt and reveal each card as it
     scrolls into view. Without motion, reviews.js still shows everything. */
  document.addEventListener("reviews:rendered", function () {
    bindTiltAll();
    var cards = Array.prototype.slice.call(document.querySelectorAll(".review-card:not(.is-visible)"));
    if (!cards.length) return;
    if (reduceMotion || typeof window.IntersectionObserver !== "function") {
      cards.forEach(function (card) { card.classList.add("is-visible"); });
      return;
    }
    var cardObserver = new window.IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    cards.forEach(function (card) { cardObserver.observe(card); });
  });
})();
