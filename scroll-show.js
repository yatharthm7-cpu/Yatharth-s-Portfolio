/* =========================================================
   Scroll showcase — a 3D card that uncurls as you scroll.
   Ported to vanilla JS from the React ContainerScroll
   component (framer-motion useScroll / useTransform).
   ========================================================= */
(function () {
  "use strict";

  var container = document.getElementById("scrollShowcase");
  if (!container) return;

  var header = container.querySelector(".ss-header");
  var card = container.querySelector(".ss-card");
  if (!header || !card) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var ticking = false;

  function update() {
    ticking = false;
    var rect = container.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;

    // Same mapping as framer-motion's default element offset
    // ("start start" -> "end end"): 0 when the container's top meets the
    // viewport's top, 1 when its bottom meets the viewport's bottom.
    var span = rect.height - vh;
    var p = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;

    var isMobile = window.innerWidth <= 768;

    var rotate = lerp(20, 0, p);
    var scale = isMobile ? lerp(0.7, 0.9, p) : lerp(1.05, 1, p);
    var translate = lerp(0, -100, p);

    card.style.transform =
      "translateY(" + translate.toFixed(2) + "px) " +
      "rotateX(" + rotate.toFixed(2) + "deg) " +
      "scale(" + scale.toFixed(4) + ")";
    header.style.transform = "translateY(" + translate.toFixed(2) + "px)";
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  if (reduced) {
    // Show the card fully settled, and skip continuous scroll tracking.
    card.style.transform = "translateY(0px) rotateX(0deg) scale(1)";
    header.style.transform = "translateY(0px)";
    return;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  // Paint the resting state before the first scroll.
  update();
})();
