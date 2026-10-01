/* Stacked reveal adapted from rxxndy's Twitter Testimonial Cards on 21st.dev. */
(function () {
  "use strict";
  var showcase = document.querySelector("[data-testimonial-showcase]");
  if (!showcase) return;
  var cards = Array.prototype.slice.call(showcase.querySelectorAll("[data-card-index]"));
  var controls = showcase.querySelector(".testimonial-controls");
  var buttons = Array.prototype.slice.call(showcase.querySelectorAll("[data-select-card]"));
  if (!cards.length || !controls || buttons.length !== cards.length) return;
  var selected = cards.length - 1;

  function activate(index) {
    if (index < 0 || index >= cards.length) return;
    showcase.setAttribute("data-active-card", String(index));
    cards.forEach(function (card, cardIndex) { card.classList.toggle("is-active", cardIndex === index); });
    buttons.forEach(function (button, cardIndex) { button.setAttribute("aria-pressed", String(cardIndex === index)); });
  }

  cards.forEach(function (card, index) {
    card.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") activate(index);
    });
    card.addEventListener("focusin", function () { activate(index); });
    // Reveal a touched card while leaving its project link a normal, single-tap link.
    card.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse") { selected = index; activate(index); }
    });
  });
  buttons.forEach(function (button, index) {
    button.addEventListener("click", function () { selected = index; activate(index); });
    button.addEventListener("keydown", function (event) {
      var next;
      if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowLeft") next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault();
      selected = next;
      activate(next);
      buttons[next].focus();
    });
  });
  showcase.addEventListener("pointerleave", function () {
    if (!showcase.contains(document.activeElement)) activate(selected);
  });
  showcase.addEventListener("focusout", function (event) {
    if (!showcase.contains(event.relatedTarget)) activate(selected);
  });
  showcase.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { selected = cards.length - 1; activate(selected); }
  });
  activate(selected);
  controls.hidden = false;
  showcase.classList.add("is-enhanced");
})();
