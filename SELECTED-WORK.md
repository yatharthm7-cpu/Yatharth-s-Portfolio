# Selected Work implementation

- Source: [Project Card by ravikatiyar162](https://21st.dev/@ravikatiyar162/components/project-card), retrieved with `get_component({id:5964})` on 2026-09-30 after checking `get_usage`. Only this component was retrieved for the Selected Work update.
- Adaptation: the same image/content/link structure and hover treatment in three semantic HTML articles with shared CSS. No React, Tailwind, packages, or build step added.
- Contribution: the portfolio owner confirmed, “I made the whole website,” for the three projects. Cards use “Complete website build”; no backend, payments, or results claims were inferred.
- Screenshots: fresh browser viewport captures of the actual URLs below, captured on 2026-09-30 at a requested 1440 × 810 viewport. Returned JPEGs are 1425 × 802; images are displayed in consistent 16:9 frames. No AI generation, compositing, or page styling changes were used.

| Image | Source |
| --- | --- |
| `assets/work-shakti.jpg` | https://shakti-mathiya.vercel.app/ |
| `assets/work-anaya.jpg` | https://anaya-kitchen.vercel.app/ |
| `assets/work-anoobie.jpg` | https://anoobiecookie.vercel.app/ |

Selected Work follows the hero directly. Navigation and the hero scroll link follow the new order. The old wheel markup, CSS, script include, and script were removed. Cards remain visible without JavaScript; hover motion respects reduced-motion preferences.

Local preview: `python -m http.server 8765 --bind 127.0.0.1`, then visit `http://127.0.0.1:8765/#work`.

Verification: inspected the running local page at 1440px desktop and 390px / 320px mobile widths. All three images loaded, all original project URLs were preserved, Selected Work immediately followed the hero, and no horizontal overflow was found. Mobile cards stack and each project link is 48px tall. Mobile menu navigation to Work closes the menu correctly. No browser console errors were captured. `node --check script.js` and `git diff --check` passed. Desktop and mobile section captures are saved in `review/`. No deployment was performed.
