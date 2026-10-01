/* Circular navigation overlay — vanilla port of Kaif UI's CircularNavigation.
   Triggered from the navbar; items fan out around a circle and close on pick. */
(function () {
  "use strict";

  var items = [
    { name: "Work", icon: "grid", href: "#work" },
    { name: "Services", icon: "spark", href: "#services" },
    { name: "Tapvora", icon: "card", href: "#nfc" },
    { name: "Process", icon: "steps", href: "#process" },
    { name: "Clients", icon: "quote", href: "#testimonials" },
    { name: "FAQ", icon: "help", href: "#faq" },
    { name: "About", icon: "user", href: "#about" },
    { name: "Contact", icon: "mail", href: "#contact" }
  ];

  var overlay = document.getElementById("circularNav");
  var dial = document.getElementById("circularDial");
  var closeButton = document.getElementById("circularClose");
  var trigger = document.getElementById("navToggle");
  var dialTrigger = document.getElementById("navDial");
  var links = document.getElementById("navLinks");
  var isOpen = false;
  var lastTrigger = null;

  if (!overlay || !dial || !trigger) return;

  var icons = {
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    spark: '<path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/>',
    card: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M8 18v-3h8v3"/>',
    steps: '<path d="M5 4h4v4H5zM11 10h4v4h-4zM17 16h4v4h-4z"/>',
    quote: '<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2 1-1.2 1.9v.4"/><path d="M12 17h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 7l9 6 9-6"/>'
  };

  items.forEach(function (item, index) {
    var angle = (360 / items.length) * index;
    var slot = document.createElement("div");
    slot.className = "circular-slot";
    slot.style.setProperty("--angle", angle + "deg");
    var link = document.createElement("a");
    link.href = item.href;
    link.className = "circular-item";
    link.setAttribute("aria-label", item.name);
    link.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[item.icon] || "") + '</svg><span>' + item.name + "</span>";
    link.addEventListener("click", function () { close(); });
    slot.append(link);
    dial.append(slot);
  });

  function open(source) {
    if (isOpen) return;
    isOpen = true;
    links.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    if (dialTrigger) dialTrigger.setAttribute("aria-expanded", "true");
    lastTrigger = source || trigger;
    overlay.hidden = false;
    document.documentElement.classList.add("nav-open");
    requestAnimationFrame(function () { overlay.classList.add("is-open"); });
    closeButton.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("nav-open");
    if (dialTrigger) dialTrigger.setAttribute("aria-expanded", "false");
    window.setTimeout(function () { overlay.hidden = true; }, 420);
  }

  trigger.addEventListener("click", function () {
    if (isOpen) close(); else open(trigger);
  });
  if (dialTrigger) {
    dialTrigger.addEventListener("click", function () {
      if (isOpen) close(); else open(dialTrigger);
    });
  }
  closeButton.addEventListener("click", function () { close(); lastTrigger.focus(); });
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay || event.target === dial.parentElement) close();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen) { close(); lastTrigger.focus(); }
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 860) close();
  });
})();
