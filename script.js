/* =========================================================
   Yatharth Rupesh Mehta — Portfolio interactions
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  function closeNav() {
    if (!toggle || !links) return;
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("open");
  }

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeNav();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeNav();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("open")) {
        closeNav();
        toggle.focus();
      }
    });
  }

  /* ---------- Sticky nav + back to top ---------- */
  var navbar = document.getElementById("navbar");
  var toTop = document.getElementById("toTop");

  function onScroll() {
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 10);
    if (toTop) toTop.classList.toggle("show", window.scrollY > 500);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Active nav link on scroll ---------- */
  var navAnchors = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]:not(.nav-cta)')
  );
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  function highlightNav() {
    var current = sections[0];
    var probe = window.scrollY + 160;
    sections.forEach(function (sec) { if (sec.offsetTop <= probe) current = sec; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    navAnchors.forEach(function (a) {
      a.classList.toggle("active", current && a.getAttribute("href") === "#" + current.id);
    });
  }
  highlightNav();
  window.addEventListener("scroll", highlightNav, { passive: true });

  /* ---------- Scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (!reduceMotion && "IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });
    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net: never leave in-viewport content hidden if the
    // observer is throttled (e.g. background tab).
    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (!el.classList.contains("in")) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
        }
      });
    }, 1200);
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Skill bars ---------- */
  var skillFills = Array.prototype.slice.call(document.querySelectorAll(".skill-fill"));
  if (!reduceMotion && "IntersectionObserver" in window && skillFills.length) {
    var skillIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.width = el.getAttribute("data-pct") + "%";
        skillIO.unobserve(el);
      });
    }, { threshold: 0.3 });
    skillFills.forEach(function (el) { skillIO.observe(el); });
  } else {
    skillFills.forEach(function (el) { el.style.width = el.getAttribute("data-pct") + "%"; });
  }

  /* ---------- NFC card tilt ----------
     The card is a physical object on the page, so it should react to the
     pointer like one. Pointer position drives yaw/pitch; leaving resets it. */
  var nfcCard = document.getElementById("nfcCard");
  if (nfcCard && !reduceMotion && finePointer) {
    var MAX_TILT = 9;
    var nfcFrame = 0;

    function tilt(px, py) {
      var r = nfcCard.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var yaw = ((px - cx) / (r.width / 2)) * MAX_TILT;
      var pitch = ((cy - py) / (r.height / 2)) * MAX_TILT;
      nfcCard.style.transform =
        "rotateY(" + yaw.toFixed(2) + "deg) rotateX(" + pitch.toFixed(2) + "deg)";
    }

    window.addEventListener("pointermove", function (event) {
      if (nfcFrame) return;
      nfcFrame = requestAnimationFrame(function () {
        nfcFrame = 0;
        tilt(event.clientX, event.clientY);
      });
    });
    window.addEventListener("pointerout", function (event) {
      if (!event.relatedTarget) nfcCard.style.transform = "";
    });
  }

  /* ---------- Typing role rotator ---------- */
  var rotator = document.getElementById("roleRotator");
  if (rotator && !reduceMotion) {
    var roles = ["Web Developer", "Digital Marketer", "NFC Card Designer", "Sales Strategist", "Creator"];
    var roleIndex = 0, charIndex = 0, deleting = false;

    function type() {
      var current = roles[roleIndex];
      if (deleting) {
        charIndex--;
      } else {
        charIndex++;
      }
      rotator.textContent = current.slice(0, charIndex);

      var delay = deleting ? 45 : 85;
      if (!deleting && charIndex === current.length) {
        delay = 1800; // hold the full word
        deleting = true;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        delay = 350;
      }
      setTimeout(type, delay);
    }
    setTimeout(type, 900);
  } else if (rotator) {
    rotator.textContent = "Web Developer & Digital Marketer";
  }

  /* ---------- Custom cursor ---------- */
  var dot = document.getElementById("cursorDot");
  var ring = document.getElementById("cursorRing");
  if (finePointer && dot && ring && !reduceMotion) {
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = "translate(" + mx + "px, " + my + "px) translate(-50%, -50%)";
    });

    (function follow() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px, " + ry + "px) translate(-50%, -50%)";
      requestAnimationFrame(follow);
    })();

    // Grow ring over interactive elements
    Array.prototype.forEach.call(
      document.querySelectorAll("a, button, input, textarea, .tech-tag, [data-cursor]"),
      function (el) {
        el.addEventListener("mouseenter", function () { ring.classList.add("is-link"); });
        el.addEventListener("mouseleave", function () { ring.classList.remove("is-link"); });
      }
    );

    document.addEventListener("mouseleave", function () {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });
    document.addEventListener("mouseenter", function () {
      dot.style.opacity = "";
      ring.style.opacity = "";
    });
  } else if (dot && ring) {
    dot.style.display = "none";
    ring.style.display = "none";
  }

  /* ---------- Animated particle background ---------- */
  var canvas = document.getElementById("bgCanvas");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with viewport, capped for perf
      var count = Math.min(Math.floor((w * h) / 16000), 110);
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);

    var LINK_DIST = 130;
    ctx.strokeStyle = "rgba(124, 92, 255, 0.28)";
    ctx.fillStyle = "rgba(160, 180, 255, 0.55)";

    (function draw() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.globalAlpha = 1 - dist / LINK_DIST;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(draw);
    })();
  }

  /* ---------- Tilt effect on cards (fine pointers only) ---------- */
  if (finePointer && !reduceMotion) {
    Array.prototype.forEach.call(
      document.querySelectorAll(".card"),
      function (card) {
        card.addEventListener("mousemove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = "translateY(-8px) perspective(800px) rotateX(" + (-py * 6) + "deg) rotateY(" + (px * 6) + "deg)";
        });
        card.addEventListener("mouseleave", function () {
          card.style.transform = "";
        });
      }
    );
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contactForm");
  var foot = document.getElementById("formFoot");

  function setInvalid(field, bad) {
    var wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("invalid", bad);
    return !bad;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("name");
      var email = document.getElementById("email");
      var message = document.getElementById("message");

      var ok = true;
      ok = setInvalid(name, name.value.trim().length < 2) && ok;
      ok = setInvalid(email, !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.value.trim())) && ok;
      ok = setInvalid(message, message.value.trim().length < 5) && ok;

      if (!ok) {
        foot.textContent = "Please fix the highlighted fields.";
        foot.className = "form-foot error";
        var firstBad = form.querySelector(".field.invalid input, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }

      // Front-end only: hand the message to the user's email client.
      var subject = encodeURIComponent("Portfolio enquiry from " + name.value.trim());
      var body = encodeURIComponent(
        message.value.trim() + "\n\n— " + name.value.trim() + "\n" + email.value.trim()
      );

      foot.innerHTML =
        "Thanks, " + name.value.trim().split(" ")[0] + "! Your message is ready — " +
        "<a href=\"mailto:yatharthm7@gmail.com?subject=" + subject + "&body=" + body +
        "\" class=\"text-link\">send it via your email app</a>.";
      foot.className = "form-foot success";
      form.querySelector("button[type=submit]").textContent = "Message ready ✓";
      form.querySelector("button[type=submit]").disabled = true;
    });

    // Clear error state as the user types
    form.addEventListener("input", function (e) {
      if (e.target.closest(".field")) {
        e.target.closest(".field").classList.remove("invalid");
        if (foot && foot.classList.contains("error")) {
          foot.textContent = "";
          foot.className = "form-foot";
        }
      }
    });
  }
})();
