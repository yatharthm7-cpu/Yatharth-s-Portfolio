# Client feedback cards

Adapted from [Twitter Testimonial Cards by rxxndy](https://21st.dev/@rxxndy/components/twitter-testimonial-cards), retrieved through the connected 21st.dev MCP service.

This portfolio is a static HTML/CSS/JavaScript site, so the React/shadcn CLI component is ported to `testimonial-cards.css` and `testimonial-cards.js`. It keeps the three-card stack, angled geometry, dimmed rear cards, and hover reveal. The existing client quotes and project links are retained. Avatars use client initials; there are no invented Twitter handles, dates, verification badges, or engagement counts.

Mouse hover reveals cards. The selector buttons and touch activation work without requiring a second tap on project links. Left/right arrows, Home, and End move between selector buttons; Escape returns to the front card. Reduced motion displays all cards in a static grid. Without JavaScript, all quotes and links remain visible in the original grid.

Run `node review/verify-testimonial-cards.cjs` for the interaction regression checks.
