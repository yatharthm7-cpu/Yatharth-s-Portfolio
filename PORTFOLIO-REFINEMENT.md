# Portfolio refinement

Completed 2026-09-30 in the existing HTML/CSS/JavaScript stack.

- Hero reference: [Minimalist Hero by ravikatiyar162](https://21st.dev/@ravikatiyar162/components/minimalist-hero), retrieved only with `get_component({id:4582})` for this update. Adapted the portrait, circle and typography composition without adding its React dependencies.
- Existing `assets/profile.jpg` and `assets/tapvora-card.png` are unchanged. No media was generated.
- Selected Work markup and shared card styles remain unchanged from the completed card update. The original project links and real website screenshots are preserved.
- Section order: Hero, Selected Work, Services, Tapvora, Process, About, Contact.
- Removed orbit, particles, typing, skill percentages, birthday details and continuous reveal effects. Motion respects reduced-motion preferences.
- The contact form sends enquiries to Formspree and shows a confirmation only after the service accepts the submission. The Formspree form must be connected to the verified inbox `yatharthm7@gmail.com`; the email and WhatsApp links remain available.

## Verification

- Visually inspected the running page at 1440px desktop and 390px mobile; checked 1024px and 320px for overflow. All images load and mobile cards stack.
- Checked section navigation, original project destinations, the live Tapvora destination, skip link, visible keyboard focus, form tab order, and mobile menu Escape/focus behavior.
- Browser form validation rejects empty fields and invalid email. The actual draft-building code was tested in isolation for whitespace validation, encoding, repeat handoffs and honest status text, without sending a message or opening a personal email application.
- `node review/verify-portfolio.cjs`, `node --check script.js` and `git diff --check` pass. No browser console errors were captured.
- Final desktop/mobile screenshots are in `review/portfolio-*.jpg`.

## Local preview

Run `python -m http.server 8765 --bind 127.0.0.1` from this folder, then open http://127.0.0.1:8765/.

No deployment was performed.
