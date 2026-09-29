/* =========================================================
   Works wheel — a portfolio index built as a wheel you turn.
   Ported to vanilla JS from the React WorksWheel component.
   The whole thing is one number - `turn` - read by a single
   rAF pass that writes transforms straight to the DOM. 0 is
   the ring, 1 is the drum with item 0 at the front, and every
   whole number after that is one more item turned past.
   ========================================================= */
(function () {
  "use strict";

  var stage = document.getElementById("wheelStage");
  var wheel = document.getElementById("wheel");
  var labelEl = document.getElementById("wheelLabel");
  var titleEl = document.getElementById("wheelTitle");
  var indexEl = document.getElementById("wheelIndex");
  if (!stage || !wheel || !labelEl || !titleEl || !indexEl) return;

  /* Geometry. The card is measured against the stage; everything else is
     measured against the card, so a narrow stage scales the whole wheel
     down with it instead of leaving a small card on a huge drum. */
  var CARD_H = 0.38; // front card height, of the stage
  var CARD_MAX_W = 0.34; // ... but never wider than this much of the stage
  var CARD_RATIO = 1.45; // card width / height
  var STEP = 40; // degrees between cards on the drum
  var DRUM = 2.22; // drum radius, in card heights
  var LENS = 2.7; // perspective distance
  var RING_R = 1.14; // ring radius
  /* The drum alone hangs the work on a plumb line. It isn't one: the strip
     curves away round an arc whose centre sits off to the LEFT, so the piece
     at the front is dead centre and its neighbours have already swung back
     left as well as up and down. BOW is that arc's radius. */
  var BOW = 1.82;
  var TITLE = 0.124; // ring label and front-card title
  var INDEX = 0.04; // the index down the right-hand side
  /** Items either side of the front still worth drawing. */
  var CULL = 1.6;

  /** How much of a wheel-notch or a dragged pixel counts as one item. */
  var WHEEL_UNITS = 900;
  var DRAG_UNITS = 420;
  /** Quiet time after the last wheel event before the wheel settles on an item. */
  var SETTLE = 140;
  /** Fraction of the remaining distance closed each frame. 1 = no smoothing. */
  var EASE = 0.12;

  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var rad = function (deg) { return (deg * Math.PI) / 180; };

  /** How far left the arc has carried something that has turned `drumDeg` off
      the front. Zero at the front, so the piece being read stays centred. */
  var bowAt = function (drumDeg, bow) {
    return -bow * (1 - Math.cos(rad(drumDeg)));
  };

  /** Both states in one chain: the ring terms fall away as `m` reaches the
      drum, and the drum terms are still zero while the ring is up. */
  function place(ringDeg, drumDeg, ringR, drumR, bow, m) {
    return (
      "translateX(" + (m * bowAt(drumDeg, bow)).toFixed(2) + "px)" +
      " rotateZ(" + ((1 - m) * ringDeg).toFixed(2) + "deg)" +
      " translateY(" + (-(1 - m) * ringR).toFixed(2) + "px)" +
      " rotateX(" + (m * drumDeg).toFixed(2) + "deg)" +
      " translateZ(" + (m * drumR).toFixed(2) + "px)"
    );
  }

  var WORKS = [
    {
      title: "Shakti Mathiya",
      tag: "E-commerce storefront",
      url: "https://shakti-mathiya.vercel.app/",
      image: "assets/work-shakti.jpg"
    },
    {
      title: "Anaya's Kitchen",
      tag: "Homemade-food brand site",
      url: "https://anaya-kitchen.vercel.app/",
      image: "assets/work-anaya.jpg"
    },
    {
      title: "aNoobieCooKie",
      tag: "Personal gaming portfolio",
      url: "https://anoobiecookie.vercel.app/",
      image: "assets/work-anoobie.jpg"
    }
  ];

  var count = WORKS.length;
  var last = Math.max(count - 1, 0);

  /* ---- Build the cards and the index ---- */
  var cards = [];
  var faces = [];
  var buttons = [];

  WORKS.forEach(function (item, i) {
    var card = document.createElement("div");
    card.className = "wheel-card";
    card.id = "works-wheel-" + i;
    card.setAttribute("role", "option");
    card.setAttribute("aria-selected", i === 0 ? "true" : "false");

    var face = document.createElement("span");
    face.className = "wheel-face";

    var img = document.createElement("img");
    img.src = item.image;
    img.alt = item.title;
    img.draggable = false;
    face.appendChild(img);

    card.appendChild(face);
    wheel.appendChild(card);
    cards.push(card);
    faces.push(face);

    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.title;
    btn.addEventListener("click", function () { to(i + 1); });
    li.appendChild(btn);
    indexEl.appendChild(li);
    buttons.push(btn);
  });

  /* ---- State ----
     Only `active` touches the DOM outside the rAF pass; turning the wheel
     never re-renders anything. */
  var turn = 0;
  var target = 0;
  var active = 0;
  var metrics = null;

  var reduced = false;
  if (window.matchMedia) {
    var query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = query.matches;
    if (query.addEventListener) {
      query.addEventListener("change", function (e) { reduced = e.matches; });
    }
  }

  function to(next) {
    target = clamp(next, 0, last + 1);
  }

  function measure() {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (!w || !h) return;

    var cardW = Math.min(h * CARD_H * CARD_RATIO, w * CARD_MAX_W);
    var cardH = cardW / CARD_RATIO;
    var drumR = cardH * DRUM;
    var ringR = cardH * RING_R;
    // Shrink the ring's cards until the circle reads as a closed loop rather
    // than beads on a wire, however many pieces the wheel is given.
    var ringScale = count
      ? clamp((((2 * Math.PI * ringR) / count) * 0.82) / (cardW || 1), 0.16, 1)
      : 1;

    metrics = {
      cardW: cardW,
      cardH: cardH,
      ringR: ringR,
      ringScale: ringScale,
      drumR: drumR,
      bow: cardH * BOW,
      depth: cardH * LENS,
      title: cardH * TITLE,
      index: cardH * INDEX
    };

    cards.forEach(function (card) {
      card.style.width = metrics.cardW + "px";
      card.style.height = metrics.cardH + "px";
      card.style.marginLeft = (-metrics.cardW / 2) + "px";
      card.style.marginTop = (-metrics.cardH / 2) + "px";
    });

    stage.style.perspective = metrics.depth + "px";
    labelEl.style.fontSize = metrics.title + "px";
    titleEl.style.fontSize = metrics.title + "px";
    indexEl.style.fontSize = metrics.index + "px";
  }

  function setActive(near) {
    active = near;
    var item = WORKS[near];
    // Rebuild the title as a link so each project is one click away. The
    // anchor is replaced rather than textContent'd, so href and target stay
    // in sync with the item currently facing the reader.
    titleEl.innerHTML = "";
    var a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = item.title;
    titleEl.appendChild(a);
    if (item.tag) {
      var span = document.createElement("span");
      span.className = "wheel-sub";
      span.textContent = item.tag;
      titleEl.appendChild(span);
    }
    stage.setAttribute("aria-activedescendant", "works-wheel-" + near);
    buttons.forEach(function (btn, i) { btn.classList.toggle("active", i === near); });
    cards.forEach(function (card, i) {
      card.setAttribute("aria-selected", i === near ? "true" : "false");
    });
  }

  /* ---- One pass per frame: ease toward the target, then write transforms ---- */
  var settling = 0;
  var rafId = 0;

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (!metrics) return;

    var gap = target - turn;
    if (Math.abs(gap) < 0.0005) turn = target;
    else turn += gap * (reduced ? 1 : EASE);

    var t = turn;
    var m = clamp(t, 0, 1);
    var pos = Math.max(0, t - 1);

    // The drum is pulled back so its front face lands on the picture plane.
    wheel.style.transform = "translateZ(" + (-m * metrics.drumR).toFixed(2) + "px)";

    for (var i = 0; i < count; i++) {
      var d = i - pos;
      var drumDeg = d * STEP;
      var card = cards[i];
      card.style.transform = place(
        d * (360 / count),
        drumDeg,
        metrics.ringR,
        metrics.drumR,
        metrics.bow,
        m
      );
      // Culled by distance, not by angle: past the neighbours everything
      // would land on the vanishing point in a heap.
      card.style.opacity = m > 0.5 && Math.abs(d) > CULL ? "0" : "1";
      card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
      faces[i].style.transform = "scale(" + lerp(metrics.ringScale, 1, m).toFixed(3) + ")";
    }

    labelEl.style.opacity = String(1 - m);
    titleEl.style.opacity = String(m);

    var near = clamp(Math.round(pos), 0, last);
    if (near !== active) setActive(near);
  }

  /* ---- Wheel ----
     Native listener because the wheel has to be cancellable — and it only
     cancels while it still has somewhere to go, so the page scrolls on at
     either end instead of trapping the reader. */
  stage.addEventListener("wheel", function (event) {
    var next = target + event.deltaY / WHEEL_UNITS;
    if (next > 0 && next < last + 1) event.preventDefault();
    to(next);
    // A wheel gesture arrives as a burst of events with no end of its own, so
    // the rest position is whatever notch it stopped on. Settle onto an item.
    window.clearTimeout(settling);
    settling = window.setTimeout(function () {
      to(Math.round(target));
    }, SETTLE);
  }, { passive: false });

  /* ---- Drag ---- */
  var drag = null;

  stage.addEventListener("pointerdown", function (event) {
    drag = event.clientY;
    if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", function (event) {
    if (drag === null) return;
    to(target + (drag - event.clientY) / DRAG_UNITS);
    drag = event.clientY;
  });
  function endDrag() {
    drag = null;
    // Land on an item rather than between two.
    if (target > 1) to(Math.round(target));
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  /* ---- Keyboard ---- */
  stage.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown") to(Math.round(target) + 1);
    else if (event.key === "ArrowUp") to(Math.round(target) - 1);
    else return;
    event.preventDefault();
  });

  /* ---- Keep the geometry in step with the stage ---- */
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(measure);
    ro.observe(stage);
  }
  window.addEventListener("resize", measure);

  measure();
  setActive(0);
  draw();
})();
