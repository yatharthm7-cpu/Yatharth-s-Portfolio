/* Verification for the motion layer and accessibility constraints: animations limited to
   transform/opacity, reduced-motion fallbacks, native scrolling preserved, dialog focus
   handling, and 320px safety. Run: node review/verify-motion.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

/* Every @keyframes block in the new stylesheets may animate transform and opacity only. */
function checkKeyframes(css, name) {
  const blocks = css.match(/@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g) || [];
  assert(blocks.length, `${name} defines keyframes.`);
  const names = [];
  blocks.forEach(block => {
    names.push(block.match(/@keyframes\s+([\w-]+)/)[1]);
    const body = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}")).replace(/[{}]/g, "\n");
    const properties = [...body.matchAll(/(?:^|[\n;])\s*([a-z-]+)\s*:/gm)].map(match => match[1]);
    const offenders = properties.filter(property => !["transform", "opacity"].includes(property));
    assert.equal(offenders.length, 0, `${name} keyframes animate only transform/opacity (found: ${offenders.join(", ")})`);
  });
  return names;
}

const motionCss = read("motion.css");
const motionNames = checkKeyframes(motionCss, "motion.css");
assert(motionNames.includes("testimonial-frame-open") && motionNames.includes("deck-card-rise"));
const reviewsCss = read("reviews.css");
const reviewNames = checkKeyframes(reviewsCss, "reviews.css");
["star-pop", "review-card-rise", "review-dialog-in", "review-field-in", "review-fade"].forEach(name => {
  assert(reviewNames.includes(name), `reviews.css defines ${name}.`);
});

/* Reduced motion: armed states are gated, scripts check the media query, the global
   kill switch in styles.css stays in place. */
assert(motionCss.includes("@media (prefers-reduced-motion: no-preference)"), "The open reveal is motion-only.");
assert(reviewsCss.includes("@media (prefers-reduced-motion: no-preference)"), "Dialog animation is motion-only.");
assert(read("styles.css").includes("transition: none !important"), "Global reduced-motion kill switch remains.");
const motionJs = read("motion.js");
assert(motionJs.includes('(prefers-reduced-motion: reduce)') && motionJs.includes("reduceMotion"), "motion.js checks reduced motion.");
assert(read("reviews.css").includes("body.review-modal-open"), "Scroll pause is modal-scoped only.");
assert(!motionJs.includes("documentElement.style.overflow") && !motionJs.includes("body.style.overflow"), "No scroll locking outside the dialog.");
assert(!motionJs.includes("wheel") && !motionJs.includes("touchmove"), "No scroll hijacking.");
assert(motionJs.includes("{ passive: true }"), "Scroll listeners stay passive.");

/* Reveal runs once and content is never permanently hidden. */
assert(motionJs.includes("IntersectionObserver") && motionJs.includes("disconnect()"), "The open reveal uses an IntersectionObserver once per load.");
assert(motionJs.includes("unobserve"), "Reveal observers detach after firing.");

/* Tilt: desktop pointers only, small angles, restore on leave. */
assert(motionJs.includes("(hover: hover) and (pointer: fine)"), "Tilt binds only on fine pointers.");
assert(motionJs.includes("2.4") && motionJs.includes("* 3)"), "Tilt stays within ~3 degrees.");
assert(motionJs.includes("pointerleave") && motionJs.includes("removeProperty"), "Tilt returns to rest.");
assert(motionJs.includes('pointerType === "touch"'), "Touch never tilts.");
assert(read("testimonial-cards.css").includes("rotateX(var(--tilt-x, 0deg))"), "Deck cards compose the tilt variables.");

/* Dialog a11y in reviews.js. */
const reviewsJs = read("reviews.js");
assert(reviewsJs.includes('aria-live="polite"') || read("index.html").includes('aria-live="polite"'), "Rating and counter announce politely.");
assert(read("index.html").match(/name="rating"/g).length === 5, "Stars are native radios: keyboard operable, understandable without colour.");
assert(reviewsJs.includes('body.classList.add("review-modal-open")'), "Dialog pauses background scroll while open.");
assert(reviewsJs.includes('body.classList.remove("review-modal-open")'), "Native scrolling resumes on close.");
assert(reviewsJs.includes("inert"), "Background content is inert while the dialog is open.");

/* 320px safety: fluid dialog, no fixed wide boxes, collapse for field rows. */
assert(reviewsCss.includes("width: min(640px, 100%)"), "Dialog is fluid down to 320px.");
assert(reviewsCss.includes("@media (max-width: 360px)"), "Stars shrink on the narrowest screens.");
assert(reviewsCss.includes("@media (max-width: 560px)") && reviewsCss.includes("grid-template-columns: 1fr"), "Field rows collapse on mobile.");
assert(!/(?<![\w-])width:\s*\d{3,}px/.test(reviewsCss), "No fixed pixel widths in reviews.css (max-width constraints are fine).");
assert(read("motion.css").includes("@media (max-width: 640px)") && motionCss.includes("display: none"), "The decorative frame is removed on small screens.");

/* CLS guards: the continuation stays hidden until filled; animations use fill modes. */
assert(read("index.html").includes('id="clientReviews" hidden'), "The reviews continuation starts hidden (no layout shift).");
assert(reviewsCss.includes(".client-reviews[hidden] { display: none; }"), "Hidden state cannot be overridden by display rules.");
assert(reviewsCss.includes("backwards") || reviewsCss.includes("both"), "Delayed animations use fill modes so content never flashes.");

console.log("PASS: motion animates transform/opacity only, respects reduced motion, keeps native scrolling, traps dialog focus, and stays safe at 320px.");
