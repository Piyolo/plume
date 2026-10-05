# PLUME — Scroll-Driven Vape Showcase

**Date:** 2026-10-05
**Status:** Approved for planning
**Path:** Architectural (new project)

---

## 1. Intent

A single-page, scroll-driven marketing site for a fictional premium vape brand. It exists to
demonstrate a high-craft front-end: pinned scroll sequences, parallax and masked reveals,
and a complete client-side ordering flow.

**What the user asked for:**

- Showcases vape products
- Assets sourced online
- Users can order, but **no backend services of any kind**
- Scroll-driven, but **no 3D objects** (no WebGL, no Three.js)

**Success criteria:**

1. Scrolling through the page feels cinematic — sections pin and choreograph rather than
   simply pass by.
2. A visitor can pick a product, add it to a cart, adjust quantities, and "check out",
   receiving a fake order number. No network request is made at any point.
3. The page renders correctly at 1440px desktop and 390px mobile widths.
4. The site opens from a static server (or `file://`) with no build step.

**Out of scope:** any server, database, API, authentication, real payment, real inventory,
analytics, CMS, or framework build tooling.

---

## 2. Product scope

Fictional brand **PLUME** — "vapour, refined." Three hero products, each given a full scroll
section, plus supporting editorial sections.

| # | Product | Type | Price |
|---|---------|------|-------|
| 1 | **PLUME ONE** | Flagship refillable pod system (matte aluminium, 900 mAh) | $64 |
| 2 | **PLUME ARC** | Ultra-slim draw-activated device (10 ml, 600 puffs) | $22 |
| 3 | **PLUME RESERVE** | Nicotine-salt e-liquid collection — 3 flavours | $18 each |

Each product carries: name, tagline, price, short description, 3–4 spec rows (mono type),
colour/variant options where relevant, and an **Add to cart** action.

---

## 3. Page architecture

Single document, top to bottom. No routes, no page transitions.

```
0.  AGE GATE            Full-screen overlay, 21+ confirmation, remembered in localStorage
1.  HERO                Full-bleed. Oversized wordmark, hero device, scroll cue
2.  MANIFESTO           Short editorial statement, scroll-linked line reveals, parallax
3.  CHAPTER 01 · ONE    Pinned scroll sequence — device held stationary while spec
                        callouts and imagery scrub past
4.  CHAPTER 02 · ARC    Pinned sequence, deliberately different choreography:
                        horizontal slide-through of colourways / dimensions
5.  CHAPTER 03 · RESERVE Pinned sequence — flavour cards advance, tasting-note text
                        cross-fades
6.  THE RANGE           Grid of all SKUs with staggered reveal; each card orderable
7.  CRAFT               Materials section — parallax image stack, hairline spec table
8.  ORDER CTA           Large closing statement + button opening the cart
9.  FOOTER              Nav, disclaimer, "this is a demo" note
```

Persistent chrome: top bar (wordmark, section name, cart button with count badge),
right-side cart drawer, checkout overlay.

---

## 4. Visual language

**Palette**

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0A0A0B` | Page background |
| `--surface` | `#131315` | Cards, drawer, overlay panels |
| `--text` | `#F3F0EA` | Primary text (warm off-white) |
| `--muted` | `#8B887F` | Secondary text, captions |
| `--line` | `rgba(243,240,234,.14)` | Hairline rules, borders |
| `--accent` | `#E8B84B` | Single accent — gold. Prices, active states, CTA |

One accent only. Ember red may appear **solely** as a product colourway swatch, never as UI.

**Typography** — all self-hosted `.woff2` in `assets/fonts/`:

- **Instrument Serif** (display) — headlines at `clamp(3rem, 11vw, 11rem)`, tight leading
  (0.92), negative tracking. Italic used for emphasis words.
- **Space Grotesk** (body/UI) — paragraphs, nav, buttons.
- **JetBrains Mono** (data) — specs, prices, chapter numbers, order numbers, HUD labels,
  uppercase with `letter-spacing: .14em`.

**Texture & detail**

- Subtle film-grain overlay (fixed, `pointer-events: none`, low opacity).
- Hairline 1px rules as section dividers, labelled with mono chapter markers. The counter
  runs `00` on the Hero, then `01`–`07` across Manifesto → Order CTA, displayed as
  `NN / 07`. The age gate, footer, drawer and checkout overlay carry no chapter marker.
- Generous negative space; nothing is boxed unless it is a card.
- No drop shadows on text; depth comes from layering and parallax.

**Motion**

- **Lenis** for inertial smooth scroll; **GSAP + ScrollTrigger** for all scroll-linked work.
- Scroll-linked animation uses `scrub` (never timed transitions tied to scroll).
- Reveals are eased and slow (`power2.out`, 0.9–1.4s) — never bouncy or springy.
- `prefers-reduced-motion: reduce` → Lenis disabled, all `scrub` pins released, content
  displayed in normal flow with no transforms.

---

## 5. Assets

- **Images:** downloaded from Unsplash or Pexels (both permit free commercial use) into
  `assets/img/`, then referenced by local path. No hotlinking.
  Sourced categories: dark product photography of devices, vapour/smoke abstracts,
  brushed-metal and matte textures, liquid/ingredient macro shots.
- **Fallback rule:** if a specific product photo cannot be sourced cleanly, that slot uses a
  vapour/texture plate with the product name set typographically — a deliberate editorial
  treatment, not a placeholder. Grey boxes and stock-looking filler are not acceptable.
- **Fonts:** `.woff2` files downloaded and declared in `assets/fonts/fonts.css`.
- Every downloaded asset is verified to load (correct bytes, correct path, correct MIME)
  before the work is called complete.

---

## 6. Ordering flow (client-side only)

**Cart**

- State shape: `[{ id, name, variant, unitPrice, qty }]`.
- Persisted to `localStorage` under a single key; restored on load.
- If `localStorage` is unavailable or throws, fall back to an in-memory store — the cart
  still works for the session, with no user-visible error.
- Drawer slides in from the right: line items, qty +/- controls, remove, subtotal,
  "Proceed to checkout". Empty state has its own copy and a CTA back to the range.

**Checkout**

- Full-screen overlay, two-column on desktop / single column on mobile.
- Fields: name, email, address, city, postcode, delivery note. Client-side validation
  only — inline error messages, no submission.
- Order summary mirrors the cart. A "demo" note is visible before the confirm button.
- On confirm: cart clears, overlay swaps to a confirmation panel showing an order number
  generated client-side (e.g. `PLM-8F3K-2026`), a fake ETA, and a "Continue" button.
- **Hard rule:** no `fetch`, no `XMLHttpRequest`, no form `action`, no third-party script
  makes a request on the user's behalf.

**Age gate**

- Full-screen overlay shown on first visit; `localStorage` records verification so it
  does not reappear on refresh. Non-21+ choice shows a friendly refusal state with a
  "take me back" link. Scroll is locked while the gate is open.

---

## 7. Technical approach

**Stack:** vanilla HTML / CSS / JS. No framework, no bundler, no `node_modules`.

GSAP, ScrollTrigger and Lenis are **vendored** as plain files in `assets/vendor/` and
loaded with `<script src>` tags — nothing is pulled from a CDN, so the page makes zero
third-party requests and works fully offline.

```
vape-showcase/
  index.html
  css/style.css          single stylesheet, custom properties, logical sections
  js/main.js             boot: age gate, Lenis, ScrollTrigger setup, reveals
  js/cart.js             cart state, drawer, checkout, order number
  js/data.js             product data (single source of truth for cards + cart)
  assets/fonts/          woff2 + fonts.css
  assets/img/            downloaded photography
  assets/vendor/         gsap.min.js, ScrollTrigger.min.js, lenis.min.js
  docs/superpowers/      spec + plan
```

**Data flow:** `js/data.js` exports the product array. The range grid and any product
chapters render from it, so prices and names can never drift between the page and the cart.

**Error handling**

- Image `onerror` → parent gets a texture-plate class so the layout never shows a broken icon.
- Malformed/absent `localStorage` → in-memory cart fallback.
- Invalid checkout fields → inline messages, focus moves to first invalid field.
- Missing section anchors → nav links degrade to top-of-page rather than dead links.

**Testing / verification**

- Screenshot verification at 1440×900 and 390×844 using the browser tool at several scroll
  positions, checking: pinning engages and releases cleanly, reveals fire, no overlapping
  or clipped text, grain and HUD sit above content.
- Functional pass: age gate → browse → add to cart → change qty → checkout → confirmation
  number → cart empty after reload.
- Confirmed by evidence (screenshots and command output) before completion is claimed.

---

## 8. Risks

- **Pinning on mobile** — long pins feel awkward on touch; chapters get shorter pin
  distances below 768px, and one chapter falls back to normal flow on very small screens.
- **Image licensing/availability** — mitigated by the texture-plate fallback in §5.
- **Smooth-scroll vs. sticky** — Lenis and native sticky positioning can fight; resolved by
  letting ScrollTrigger own pinning and Lenis only own scroll interpolation, verified early.
