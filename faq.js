/* FAQ accordion — vanilla port of arihantcodes' Accordion Generative (21st.dev).
   Items open one at a time; the reveal staggers its inner lines so the answer
   assembles itself instead of appearing as a block. Questions may be replaced
   by the CMS after load, so binding is re-run when new items arrive. */
(function () {
  "use strict";

  var accordion = document.querySelector(".faq-list");
  if (!accordion) return;

  var reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function close(item) {
    var button = item.querySelector(".faq-trigger");
    var panel = item.querySelector(".faq-panel");
    item.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  }

  function open(item) {
    var button = item.querySelector(".faq-trigger");
    var panel = item.querySelector(".faq-panel");
    item.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    panel.hidden = false;
  }

  /* Fresh items arrive from the CMS, so binding runs against whatever is present. */
  function init() {
    var items = Array.prototype.slice.call(accordion.querySelectorAll(".faq-item"));
    items.forEach(function (item, index) {
      if (item.dataset.faqBound === "true") return;
      item.dataset.faqBound = "true";
      item.style.setProperty("--faq-index", String(index));

      var button = item.querySelector(".faq-trigger");
      var panel = item.querySelector(".faq-panel");
      if (!button || !panel) return;

      button.setAttribute("aria-controls", panel.id);
      panel.hidden = true;

      button.addEventListener("click", function () {
        var wasOpen = item.classList.contains("is-open");
        // Single-open accordion: collapse the siblings so the open item stays the focus.
        items.forEach(function (other) {
          if (other !== item && other.classList.contains("is-open")) close(other);
        });
        if (wasOpen) close(item); else open(item);
      });

      // Space and Enter already fire click on buttons; Arrow keys move between questions.
      button.addEventListener("keydown", function (event) {
        var direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (!direction) return;
        event.preventDefault();
        var next = items[(index + direction + items.length) % items.length];
        if (next) next.querySelector(".faq-trigger").focus();
      });
    });
  }

  init();

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var openItem = accordion.querySelector(".faq-item.is-open");
    if (openItem) close(openItem);
  });

  /* The CMS replaces the list after load; re-bind whatever arrives. */
  document.addEventListener("faq:content-rendered", init);

  if (!reducedMotion && typeof window.IntersectionObserver === "function") {
    var revealObserver = new window.IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    init.reveal = function () {
      accordion.querySelectorAll(".faq-item:not(.motion-reveal)").forEach(function (item) {
        item.classList.add("motion-reveal");
        revealObserver.observe(item);
      });
    };
    init.reveal();
    document.addEventListener("faq:content-rendered", init.reveal);
    document.documentElement.classList.add("motion-ready");
  }
})();
