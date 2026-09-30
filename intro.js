/* Scroll distance opens the entrance; normal document scrolling reveals the site. */
(function () {
  "use strict";

  var intro = document.getElementById("introOverlay");
  var spacer = document.querySelector(".intro-scroll");
  if (!intro || !spacer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var left = intro.querySelector(".intro-panel-left");
  var right = intro.querySelector(".intro-panel-right");
  var copy = intro.querySelector(".intro-copy");
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
    var opening = clamp((progress - 0.05) / 0.7, 0, 1);
    var curtainShift = (opening * 102).toFixed(2) + "%";
    var textOpacity = clamp(1 - progress / 0.42, 0, 1);

    left.style.transform = "translateX(-" + curtainShift + ")";
    right.style.transform = "translateX(" + curtainShift + ")";
    copy.style.opacity = String(textOpacity);
    top.style.opacity = String(textOpacity);
    bottom.style.opacity = String(textOpacity);
    bar.style.transform = "scaleX(" + progress.toFixed(3) + ")";
    intro.style.opacity = String(clamp((1 - progress) / 0.22, 0, 1));
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
