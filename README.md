# PLUME

A scroll-driven single-page showcase for a fictional premium vape brand, built to
demonstrate high-craft front-end work: pinned scroll sequences, scroll-linked
reveals, parallax, and a complete client-side ordering flow.

> **This is a design demo.** No products are sold, no order is placed, and
> nothing leaves your browser. PLUME is not a real brand and is not affiliated
> with any real company. 21+ only — nicotine is an addictive substance.

## The constraints it holds itself to

| Constraint | How it is met |
|---|---|
| No backend | Zero `fetch`, zero `XMLHttpRequest`, no form `action`. Cart and checkout are pure client-side state. |
| No third-party requests | Every script, stylesheet, font and image is served from this origin. `performance.getEntriesByType('resource')` contains no foreign host. |
| No 3D | No WebGL, no Three.js, and **zero `<canvas>` elements** in the document. |
| No build step | Plain HTML, CSS and ES5-compatible classic scripts. Copy the folder to any static host. |
| No hotlinked assets | 11 images and 7 font files are downloaded and self-hosted. |

## Running it

Any static file server works — there is nothing to build.

```bash
python -m http.server 8080
# then open http://localhost:8080/
```

## Tests

99 tests, no framework or dependencies beyond Node's built-in runner:

```bash
node --test
```

They cover the catalogue, the storage-backed cart store, money and order-number
formatting, checkout validation, asset integrity (real JPEG magic bytes, resolved
paths), and structural guards for the scroll engine, pinned chapters and visual
system.

## Responsive and motion

Three viewports are treated as equally load-bearing: **1440×900**, **834×1112**
and **390×844**. The range grid collapses 3 → 2 → 1 columns, chapters keep two
columns until 768px, and the HUD sheds its centre label before its cart button.

`prefers-reduced-motion: reduce` releases every pin, disables Lenis entirely,
kills all parallax and leaves all content visible in normal flow.

## Notable implementation detail

Every chapter is taller than its viewport (measured 930–1265px on a 900px
desktop, 1567–1943px on an 844px phone), so a section cannot simply be pinned —
its tail would be unreachable. Instead each chapter gets a fixed 100vh frame and
the copy column is scrubbed through it, which is exactly the spec's intent: the
device holds stationary while the spec callouts and imagery travel past.

## Structure

```
index.html          single document: all nine sections plus the chrome
css/style.css       tokens, visual system, responsive breakpoints
js/data.js          product catalogue (single source of truth)
js/cart-store.js    cart state, storage injected so it is testable
js/cart.js          cart UI, checkout, money + order formatting
js/main.js          age gate, scroll engine, pinned chapters
assets/vendor/      GSAP 3.12.5, ScrollTrigger 3.12.5, Lenis 1.1.13
assets/fonts/       7 latin-subset woff2 files
assets/img/         11 self-hosted images
tests/              node --test suites
docs/               design spec, implementation plan, asset manifest
```

## Credits and licences

- **Images** — 11 photographs from [Unsplash](https://unsplash.com), used under
  the [Unsplash License](https://unsplash.com/license). Exact source URLs and
  what each image depicts are recorded in [`docs/asset-manifest.md`](docs/asset-manifest.md).
- **Fonts** — Instrument Serif, Space Grotesk and JetBrains Mono, subset and
  self-hosted, under the [SIL Open Font License](https://fonts.google.com/attribution).
- **Libraries** — [GSAP](https://gsap.com) (standard "no charge" licence) and
  [Lenis](https://github.com/darkroomengineering/lenis) (MIT), both vendored.
