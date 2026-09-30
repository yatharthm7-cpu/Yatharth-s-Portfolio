/* The opening scene fades as normal document scrolling reaches the portfolio. */
(function () {
  "use strict";

  var intro = document.getElementById("introOverlay");
  var spacer = document.querySelector(".intro-scroll");
  if (!intro || !spacer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var media = intro.querySelector(".intro-media");
  var content = intro.querySelector(".intro-content");
  var top = intro.querySelector(".intro-topline");
  var bottom = intro.querySelector(".intro-bottomline");
  var bar = intro.querySelector(".intro-progress");
  var coveredContent = [document.querySelector(".navbar"), document.getElementById("main"), document.querySelector(".footer")].filter(Boolean);
  var scheduled = false;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function update() {
    scheduled = false;
    var distance = spacer.getBoundingClientRect().height || window.innerHeight;
    var progress = clamp(window.scrollY / distance, 0, 1);
    var textOpacity = 1 - clamp((progress - 0.55) / 0.38, 0, 1);
    var overlayOpacity = 1 - clamp((progress - 0.72) / 0.28, 0, 1);

    media.style.transform = "scale(" + (1 + progress * 0.06).toFixed(3) + ")";
    content.style.transform = "translateY(-" + (progress * 30).toFixed(1) + "px)";
    content.style.opacity = String(textOpacity);
    top.style.opacity = String(textOpacity);
    bottom.style.opacity = String(textOpacity);
    bar.style.transform = "scaleX(" + progress.toFixed(3) + ")";
    intro.style.opacity = String(overlayOpacity);
    intro.style.pointerEvents = progress >= 0.95 ? "none" : "auto";
    intro.inert = progress >= 0.95;
    coveredContent.forEach(function (element) { element.inert = progress < 0.95; });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }

  document.documentElement.classList.add("intro-ready");
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  update();
})();
