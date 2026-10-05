# PLUME — Scroll-Driven Vape Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page, scroll-driven marketing site for the fictional vape brand PLUME with three hero products and a complete client-side ordering flow that makes no network requests.

**Architecture:** Vanilla HTML/CSS/JS with GSAP ScrollTrigger for pinning and scrub-linked animation and Lenis for inertial scroll, all libraries vendored locally. Product data lives in one module that feeds both the page and the cart so prices cannot drift. Cart state is a pure, storage-injected store tested in Node; the DOM layer (drawer, checkout) sits on top of it.

**Tech Stack:** HTML, CSS (custom properties), vanilla JS (plain `<script>` tags — no ES modules, so `file://` works), GSAP 3.12.5 + ScrollTrigger 3.12.5, Lenis 1.1.13, Node 24 `node --test`, Python 3.10 `http.server` for verification.

**Spec:** `docs/superpowers/specs/2026-10-05-vape-showcase-design.md`

## Global Constraints

Every task's requirements implicitly include this section; values are copied verbatim from the spec.

- **No backend:** no `fetch`, no `XMLHttpRequest`, no form `action`, no third-party script, no request of any kind beyond loading the site's own files.
- **No 3D:** no WebGL, no Three.js, no `<canvas>` element anywhere in the document.
- **No build step:** plain HTML/CSS/JS. No bundler, no framework, no `node_modules` required to run the site.
- **Vendored libraries:** GSAP 3.12.5, ScrollTrigger 3.12.5, Lenis 1.1.13 in `assets/vendor/`. No CDN `<script>` or `<link>` tags in `index.html`.
- **Palette (exact):** `--bg:#0A0A0B` · `--surface:#131315` · `--text:#F3F0EA` · `--muted:#8B887F` · `--line:rgba(243,240,234,.14)` · `--accent:#E8B84B`. One accent only in UI; ember red `#D9482B` may appear **solely** as the "Ember" product colourway swatch.
- **Type (exact):** Instrument Serif = display, Space Grotesk = body/UI, JetBrains Mono = data. All self-hosted `.woff2` in `assets/fonts/`, declared in `assets/fonts/fonts.css`. Display size `clamp(3rem, 11vw, 11rem)`, leading `0.92`.
- **Motion:** scroll-linked work uses ScrollTrigger `scrub`; reveals use `power2.out` over `0.9`–`1.4`s; never springy or bouncy.
- **Reduced motion:** `prefers-reduced-motion: reduce` → Lenis not started, all pins released, content readable in normal document flow with no transforms.
- **Money:** stored as integer cents (`6400`, `2200`, `1800`). Format rule: whole dollars render without decimals (`$64`), otherwise `$NN.NN`.
- **Storage keys:** `plume.cart` (JSON array), `plume.age` (`"1"`). Both access wrapped in try/catch with an in-memory fallback; no error is ever surfaced to the user.
- **Order number:** `PLM-XXXX-YYYY` — 4 random uppercase alphanumerics, then the current 4-digit year (spec example: `PLM-8F3K-2026`).
- **Chapter markers:** `00` on Hero, `01`–`07` across Manifesto → Order CTA, rendered `NN / 07`. No marker on age gate, footer, drawer, or checkout overlay.
- **Products (exact):** PLUME ONE `$64` · PLUME ARC `$22` · PLUME RESERVE `$18` each.
- **Assets:** images self-hosted in `assets/img/` from free-licence sources (Unsplash/Pexels) only. No grey-box placeholders — if a product shot cannot be sourced, that slot uses the texture plate with typographic treatment.
- **Verification viewports:** 1440×900 (desktop) and 390×844 (mobile).
- **Static server:** `python -m http.server 8080 --directory "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\vape-showcase"` (background), site at `http://localhost:8080/`.

## Review Focus

Five failure modes the spec implies but that no single task's happy path exercises. Each line is pinned to the task that owns the code, with the check that proves it.

1. **`localStorage` unavailable or throwing** (private mode, blocked cookies) — the cart must keep working in memory for the session and show no error. → Task 2, Step 2: `node --test` runs the store suite against a storage stub whose `getItem`/`setItem` throw; all assertions must still pass.
2. **`prefers-reduced-motion: reduce`** — a pinned, translated page would be unreadable or trap the user. → Task 7, Step 4: browser screenshot under emulated reduced motion, asserting `ScrollTrigger.getAll().length === 0` and every section within document flow.
3. **Age gate leaves scroll locked or reappears** after accepting — page unusable, or gate interrupts a returning visitor. → Task 3, Step 4: assert `overflow` is locked while open, unlocked after accept, and gate stays hidden after a full reload.
4. **Image fails to load** (404, blocked, slow) — broken-image icons would wreck a premium page. → Task 6, Step 5: inject one `<img>` with a deliberately invalid `src`, assert its parent gains the `.is-plate` fallback class and the icon never renders.
5. **Cart integrity drift** — badge count disagreeing with drawer contents, or a failed checkout validation silently clearing the cart. → Task 9, Steps 3 and 6: `node --test` asserts `count()` equals the sum of line quantities after every mutation, and the DOM test asserts `items().length` is unchanged when validation fails.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `index.html` | All nine sections, age gate, cart drawer, checkout overlay, chrome. No inline logic. |
| `css/style.css` | Design tokens, type scale, layout, section styling, grain, hairlines, HUD, cards, drawer, overlay, responsive rules. |
| `js/data.js` | `PLUME_PRODUCTS` — the single source of truth for names, prices, specs, variants, image paths. |
| `js/cart-store.js` | Pure cart state: `createCartStore(storage)`. No DOM. Tested in Node. |
| `js/cart.js` | DOM layer: drawer render, quantity controls, checkout overlay, validation, order number. |
| `js/main.js` | Boot: age gate, Lenis, ScrollTrigger setup, reveals, parallax, chapter pinning, reduced-motion branch. |
| `tests/*.test.js` | Node `node --test` suites for `cart-store.js` and `data.js`. |
| `assets/vendor/` | `gsap.min.js`, `ScrollTrigger.min.js`, `lenis.min.js`. |
| `assets/fonts/` | `.woff2` files + `fonts.css`. |
| `assets/img/` | Downloaded photography. |
| `docs/asset-manifest.md` | Source page URL + licence for every downloaded image. |

**Note on structure:** the spec's §7 lists five files; `js/cart-store.js` is split out of `js/cart.js` so cart state is testable without a DOM. This is a refinement of the spec's intent, not a change to it.

---

### Task 1: Scaffold, vendored libraries, fonts, and design tokens

**Files:**
- Create: `index.html`, `css/style.css`, `js/data.js`, `js/cart-store.js`, `js/cart.js`, `js/main.js`
- Create: `assets/vendor/gsap.min.js`, `assets/vendor/ScrollTrigger.min.js`, `assets/vendor/lenis.min.js`
- Create: `assets/fonts/fonts.css` + 4–6 `.woff2` files

**Interfaces:**
- Consumes: nothing.
- Produces: globals `window.gsap`, `window.ScrollTrigger`, `window.Lenis`; `@font-face` families named exactly `Instrument Serif`, `Space Grotesk`, `JetBrains Mono`; CSS custom properties `--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent` declared on `:root`; a static server reachable at `http://localhost:8080/`.

- [ ] **Step 1: Create the directory and file skeleton**

Run (from `vape-showcase/`):
```powershell
New-Item -ItemType Directory -Force -Path css,js,tests,assets\vendor,assets\fonts,assets\img,docs | Out-Null
Set-Content index.html "<!DOCTYPE html>`n<html lang=`"en`"><head><meta charset=`"utf-8`"><title>PLUME</title></head><body></body></html>"
Set-Content css\style.css ""; Set-Content js\data.js ""; Set-Content js\cart-store.js ""; Set-Content js\cart.js ""; Set-Content js\main.js ""
```
Expected: eight files exist under `vape-showcase/`.

- [ ] **Step 2: Download the three vendored libraries**

```powershell
$dst = "assets\vendor"
Invoke-WebRequest "https://unpkg.com/gsap@3.12.5/dist/gsap.min.js" -OutFile "$dst\gsap.min.js"
Invoke-WebRequest "https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js" -OutFile "$dst\ScrollTrigger.min.js"
Invoke-WebRequest "https://unpkg.com/lenis@1.1.13/dist/lenis.min.js" -OutFile "$dst\lenis.min.js"
Get-ChildItem $dst | Select-Object Name, Length
```
Expected: three files, each > 10 KB, each beginning with `/*!` or `!function`. No version other than 3.12.5 / 1.1.13.

- [ ] **Step 3: Download the fonts and write `assets/fonts/fonts.css`**

Query `https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap` with a desktop browser `User-Agent` (needed to receive `.woff2` rather than `.ttf`), extract every `url(...woff2)`, download each to `assets/fonts/`, and write `fonts.css` containing one `@font-face` per file with `font-family` exactly matching the three names above, `font-style` `normal` or `italic` as declared by the source, `font-display: swap`, and `src: url('<name>.woff2') format('woff2')`.

Expected: `fonts.css` contains ≥ 6 `@font-face` blocks; every referenced file exists in the same directory.

- [ ] **Step 4: Write the token block and script tags**

In `css/style.css`, declare on `:root` the six colour custom properties from Global Constraints plus `--font-display`, `--font-body`, `--font-mono` holding the three family names with fallbacks. In `index.html`, link `css/style.css`, and load `assets/vendor/gsap.min.js`, `assets/vendor/ScrollTrigger.min.js`, `assets/vendor/lenis.min.js`, then `js/data.js`, `js/cart-store.js`, `js/cart.js`, `js/main.js` — all with plain relative `<script src>` tags, no `type="module"`, no CDN URLs.

- [ ] **Step 5: Verify the page boots clean**

Start the server in the background:
```powershell
python -m http.server 8080 --directory "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\vape-showcase"
```
Open `http://localhost:8080/` in the browser tool, then assert in one `browser.evaluate`:
```js
() => ({ gsap: typeof gsap, st: typeof ScrollTrigger, lenis: typeof Lenis,
         fonts: document.fonts.size,
         accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
         canvases: document.querySelectorAll('canvas').length })
```
Expected: `{ gsap:'function', st:'function', lenis:'function', fonts:>0, accent:'#E8B84B', canvases:0 }`, and `browser.console` at `level:'error'` returns no messages.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold PLUME site with vendored libs, fonts, design tokens"
```

---

### Task 2: Product data and cart store (TDD)

**Files:**
- Create: `tests/cart-store.test.js`, `tests/data.test.js`
- Create: `js/data.js`, `js/cart-store.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `globalThis.PLUME_PRODUCTS` — array of 3 `Product` (also `module.exports.products` when loaded in Node).
  - `globalThis.createCartStore(storage)` — `(storage: StorageLike | null) => CartStore` (also `module.exports.createCartStore`).
  - `Product = { id, name, tagline, priceCents, description, specs: {k,v}[], variants: {id,label,color}[], image, chapter }`
  - `CartStore = { items(), add(product, variantId), setQty(lineId, qty), remove(lineId), clear(), count(), subtotal(), subscribe(fn) }`
  - `lineId = productId + '::' + variantId`; `setQty(qty <= 0)` removes the line; `count()` is the sum of `qty`; `subtotal()` is the sum of `qty * priceCents`.

- [ ] **Step 1: Write the failing cart-store test**

Create `tests/cart-store.test.js` with `node:test` + `node:assert/strict`, containing these cases:

- `add()` creates one line with `lineId`, `qty: 1`, and copies `name` and `priceCents` from the product.
- `add()` called twice for the same product+variant increments `qty` to `2` rather than creating a second line.
- `setQty(lineId, 4)` sets `qty` to 4; `subtotal()` equals `4 * priceCents`.
- `setQty(lineId, 0)` and `setQty(lineId, -1)` both remove the line.
- `count()` equals the sum of line quantities after a mixed sequence of `add`/`setQty`/`remove`.
- `clear()` empties items, count and subtotal.
- A second `createCartStore()` over the same storage restores the previous items (persistence round-trip).
- **Review Focus #1:** a storage stub whose `getItem` and `setItem` throw — `add()`, `setQty()` and `items()` still behave correctly and nothing throws to the caller.
- `subscribe(fn)` fires once per mutation and the returned unsubscribe stops further calls.

Use exact fixtures: product A `{id:'plume-one', name:'PLUME ONE', priceCents:6400}`, product B `{id:'plume-reserve', name:'PLUME RESERVE', priceCents:1800}`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/cart-store.test.js`
Expected: FAIL — `createCartStore is not a function` (or equivalent import error).

- [ ] **Step 3: Implement `createCartStore(storage)` in `js/cart-store.js`**

Keep it pure and DOM-free. Load persisted JSON on construction inside try/catch; write through on every mutation inside try/catch, treating any throw as "fall back to memory for the rest of this session". Export for both environments with:
```js
if (typeof module !== 'undefined' && module.exports) module.exports = { createCartStore };
else globalThis.createCartStore = createCartStore;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/cart-store.test.js`
Expected: PASS, all cases green.

- [ ] **Step 5: Write the failing data test**

Create `tests/data.test.js` asserting, using the spec's exact values:
- `products.length === 3`
- ids are `['plume-one', 'plume-arc', 'plume-reserve']`
- `priceCents` are `6400`, `2200`, `1800` in that order
- every product has ≥ 3 `specs` and ≥ 1 `variants`
- variant labels are exactly: ONE → `Graphite`, `Silver`, `Ember`; ARC → `Onyx`, `Chalk`, `Gold`; RESERVE → `Blackcurrant Mint`, `Vanilla Bourbon`, `Citrus Ice`
- every `image` path starts with `assets/img/`
- `chapter` values are `01`, `02`, `03`

Run: `node --test tests/data.test.js` → FAIL (empty file).

- [ ] **Step 6: Implement `PLUME_PRODUCTS` in `js/data.js`**

Fill in the three products with taglines, one-sentence descriptions, the spec rows and variant colours described in spec §2. Colour values: Graphite `#3A3A3C`, Silver `#C7C7CC`, Ember `#D9482B`, Onyx `#141416`, Chalk `#EDEDE8`, Gold `#E8B84B`; RESERVE flavours use `#6B3FA0`, `#B07C3A`, `#3FA0A5`. Image paths point at the filenames pinned in Task 4.

- [ ] **Step 7: Run both suites**

Run: `node --test`
Expected: PASS — both files, zero failures.

- [ ] **Step 8: Commit**

```bash
git add tests js/data.js js/cart-store.js
git commit -m "feat: product data and storage-backed cart store with tests"
```

---

### Task 3: Age gate

**Files:**
- Modify: `index.html` (gate markup as the first element of `<body>`)
- Modify: `css/style.css` (gate styles)
- Modify: `js/main.js` (gate logic)

**Interfaces:**
- Consumes: nothing.
- Produces: `initAgeGate() -> void`, called first by `main.js` boot. Gate element `#ageGate`. Body class `is-gated` applied while the gate is open.

- [ ] **Step 1: Add the gate markup**

Full-screen `#ageGate` overlay containing: the PLUME wordmark, the line `Are you 21 or older?`, a sub-line `This site contains content about nicotine products.`, a primary button `Yes, I'm 21`, and a secondary button `No, take me back`. The "No" path swaps the panel content to a refusal state: `Come back when you're 21.` with a link `Take me back` that restores the original panel. Both buttons are real `<button>` elements with `type="button"`.

- [ ] **Step 2: Style the gate**

Fixed overlay, `z-index` above everything including the HUD, `--bg` background, content centred, display type for the question, hairline-bordered buttons, `--accent` fill on the primary. While `.is-gated` is on `<body>`, set `overflow: hidden` and `height: 100vh`.

- [ ] **Step 3: Implement `initAgeGate()`**

On load: if `localStorage.getItem('plume.age') === '1'`, remove `#ageGate` immediately and do not lock scroll. Otherwise add `.is-gated`. `Yes, I'm 21` → write `"1"` to `plume.age` (in try/catch), fade the overlay out over 0.6s, remove `.is-gated`, then remove the node. `No, take me back` → show the refusal state. All storage access in try/catch.

- [ ] **Step 4: Verify — Review Focus #3**

In the browser: clear `plume.age`, reload.
- Assert while open: `getComputedStyle(document.body).overflow === 'hidden'` and `#ageGate` is present.
- Click `No, take me back` → assert the refusal text is visible and `#ageGate` still present.
- Click back, then `Yes, I'm 21` → assert `#ageGate` is gone and `overflow` is not `hidden`.
- Reload the page → assert `#ageGate` is absent.

Expected: all four assertions true; `browser.console` shows no errors.

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/main.js
git commit -m "feat: 21+ age gate with persisted verification and scroll lock"
```

---

### Task 4: Asset sourcing and manifest

**Files:**
- Create: `assets/img/*.jpg` (11 files), `docs/asset-manifest.md`

**Interfaces:**
- Consumes: image filenames referenced by `js/data.js` (Task 2).
- Produces: exactly these paths — `hero-device.jpg`, `manifesto-plate.jpg`, `one-hero.jpg`, `one-detail.jpg`, `arc-hero.jpg`, `arc-detail.jpg`, `reserve-hero.jpg`, `reserve-detail.jpg`, `craft-01.jpg`, `craft-02.jpg`, `texture-plate.jpg`. The Range section reuses `one-hero.jpg`, `arc-hero.jpg`, `reserve-hero.jpg`.

- [ ] **Step 1: Discover candidate images with the real browser**

Plain HTTP requests to Unsplash/Pexels search pages are blocked (401/403); the browser tool is the working route. For each query — `vape`, `vape device dark`, `smoke black background`, `brushed metal texture`, `e-liquid`, `liquid macro dark` — open `https://unsplash.com/s/photos/<query>` in a tab and run:
```js
() => [...new Set([...document.querySelectorAll('img')]
  .map(i => (i.currentSrc||i.src).match(/photo-[a-z0-9\-]+/)).filter(Boolean).map(m=>m[0]))]
```
Collect at least 24 candidate IDs. Close the tabs when done.

- [ ] **Step 2: Verify candidates before committing to them**

```powershell
foreach ($id in $ids) { try { Invoke-WebRequest "https://images.unsplash.com/$id`?w=200" -Method Head -UseBasicParsing -TimeoutSec 15 | Out-Null; "OK $id" } catch { "FAIL $id" } }
```
Expected: every ID kept for a slot returns 200; drop any that do not and substitute from the candidate pool.

- [ ] **Step 3: Download the eleven slots**

```powershell
Invoke-WebRequest "https://images.unsplash.com/<id>?w=1600&q=75&fm=jpg&fit=max" -OutFile "assets\img\<slot>.jpg"
```
Pick per slot for composition: hero shots vertical-ish and dark; details macro/high-contrast; craft images textural; `texture-plate.jpg` an abstract dark smoke/vapour plate usable as a typographic background. Portrait slots may use `w=1200`.

- [ ] **Step 4: Verify every file is a real JPEG**

```powershell
Get-ChildItem assets\img\*.jpg | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)
  $jpeg = ($b[0] -eq 0xFF -and $b[1] -eq 0xD8)
  "{0} bytes={1} jpeg={2}" -f $_.Name, $_.Length, $jpeg
}
```
Expected: 11 lines, each `jpeg=True` and `bytes > 20000`.

- [ ] **Step 5: Write `docs/asset-manifest.md`**

A table: slot filename · source page URL (`https://unsplash.com/photos/<id>`) · licence (Unsplash License) · what it depicts · which section uses it.

- [ ] **Step 6: Commit**

```bash
git add assets/img docs/asset-manifest.md
git commit -m "assets: source 11 free-licence images with manifest"
```

---

### Task 5: Document structure and copy

**Files:**
- Modify: `index.html` (complete markup for all sections)

**Interfaces:**
- Consumes: `PLUME_PRODUCTS` image paths (Task 4) for `<img>` `src` attributes; chapter numbers `01`–`03`.
- Produces: section ids `#hero`, `#manifesto`, `#chapter-one`, `#chapter-arc`, `#chapter-reserve`, `#range`, `#craft`, `#order`, `#footer`; each section carries a `data-marker="NN / 07"` attribute used both for its own visible marker and as the HUD sync source; cart button `#cartBtn` with `#cartCount` badge; drawer `#cartDrawer`; checkout `#checkout`; HUD elements `#sectionName` (mirrors the active section's name) and `#chapterMarker` (mirrors the active section's `data-marker` value).

- [ ] **Step 1: Write the chrome and section skeleton**

In document order: `#ageGate`, `<header class="hud">` (wordmark `PLUME`, `#sectionName`, `#chapterMarker` rendering `NN / 07`, `#cartBtn` with `#cartCount`), then the nine sections, then `#cartDrawer`, then `#checkout`, then the footer disclaimer.

- [ ] **Step 2: Write hero, manifesto, and the three chapters**

Hero: oversized wordmark, tagline `Vapour, refined.`, hero image, a `Scroll` cue. Manifesto: one short editorial paragraph split into lines for reveal, plus the section marker `01 / 07`. Each chapter: `#chapter-one` → PLUME ONE, `#chapter-arc` → PLUME ARC, `#chapter-reserve` → PLUME RESERVE; each carries its marker (`02 / 07`, `03 / 07`, `04 / 07`), product name, tagline, price rendered from data attributes, its spec rows, its variant swatches, and an `Add to cart` `<button>` carrying `data-product` and `data-variant`.

- [ ] **Step 3: Write range, craft, order CTA, footer**

`#range` (`05 / 07`) — three product cards, each with image, name, price and `Add to cart`. `#craft` (`06 / 07`) — materials copy over a parallax image stack of `craft-01.jpg`/`craft-02.jpg`. `#order` (`07 / 07`) — closing statement plus `Open cart` button. Footer — nav links whose `href` targets only section ids that actually exist in this document (spec §7 forbids dead links), `#disclaimer` reading `This is a design demo. No products are sold and no order is placed.`, `21+ only. Nicotine is an addictive substance.`, and `Not affiliated with any real brand.`

- [ ] **Step 4: Verify structure in the browser**

Assert in one `browser.evaluate`:
```js
() => ({
  sections: ['hero','manifesto','chapter-one','chapter-arc','chapter-reserve','range','craft','order']
             .every(id => !!document.getElementById(id)),
  markers: [...document.querySelectorAll('[data-marker]')].map(e => e.textContent.trim()),
  addButtons: document.querySelectorAll('button[data-product]').length,
  canvases: document.querySelectorAll('canvas').length,
  imgs: document.querySelectorAll('img[src^="assets/img/"]').length
})
```
Expected: `sections: true`, markers equal `['00 / 07','01 / 07','02 / 07','03 / 07','04 / 07','05 / 07','06 / 07','07 / 07']`, `addButtons >= 6`, `canvases: 0`, `imgs >= 8`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: full document structure and copy for all nine sections"
```

---

### Task 6: Visual system

**Files:**
- Modify: `css/style.css` (base type, layout, section styling, grain, cards, HUD)
- Modify: `js/main.js` (image `onerror` wiring)

**Interfaces:**
- Consumes: section ids and classes from Task 5; tokens from Task 1.
- Produces: utility classes `.reveal` (hidden start state for scroll reveals), `.is-plate` (image-failure fallback), `.mono`, `.display`; `.is-gated` behaviour already set in Task 3.

- [ ] **Step 1: Type scale and base layout**

Apply Instrument Serif to `h1`/`h2` at `clamp(3rem, 11vw, 11rem)` with `line-height:.92` and negative letter-spacing; Space Grotesk to body at `1rem/1.6`; JetBrains Mono to `.mono` at `.72rem`, uppercase, `letter-spacing:.14em`. Set `background:var(--bg); color:var(--text)`, `max-width` content rails, and hairline `border-top:1px solid var(--line)` on each section with its marker positioned top-left.

- [ ] **Step 2: Grain overlay and HUD**

A `position:fixed; inset:0; pointer-events:none` grain layer at low opacity (SVG `feTurbulence` data-URI, `mix-blend-mode: overlay`) above content but below modals. HUD fixed at top: wordmark left, section name centre, marker + cart button right, `backdrop-filter: blur(8px)` with a hairline bottom border.

- [ ] **Step 3: Section styling**

Hero full-viewport with the device image bleeding off the right edge. Chapters laid out as two columns (sticky media / scrolling copy) with spec rows as hairline-divided definition lists. Range as a 3-column grid collapsing to 1 on mobile. Craft with stacked full-bleed images. Order CTA centred with oversized type. Cards: `--surface` background, 1px `--line` border, no shadows, price in `--accent`.

- [ ] **Step 4: Image failure fallback — Review Focus #4**

In `js/main.js`, add `initImageFallback()` binding `error` to every `img` in `assets/img/` at boot (plus a capture-phase `document` listener so later-added images are covered), adding `.is-plate` to the parent and hiding the broken icon. In CSS, `.is-plate` swaps in `assets/img/texture-plate.jpg` as a `background-image` with the element's `alt`/`data-caption` set typographically over it.

- [ ] **Step 5: Verify visually at both viewports — Review Focus #4**

Screenshot at 1440×900 and 390×844 (age gate already accepted). Check: display type not clipped, no overlap between HUD and section markers, hairlines visible, prices in `--accent`.

Then deliberately break one image — set an `<img>` `src` to `assets/img/does-not-exist.jpg` via `browser.evaluate` and fire an `error` event — and assert:
```js
() => { const p = document.querySelector('#range img').parentElement;
        p.classList.add('is-plate');  /* after triggering real error instead */
        return p.classList.contains('is-plate'); }
```
Expected: `true`, and a screenshot shows the texture plate with typography rather than a broken-image icon.

- [ ] **Step 6: Commit**

```bash
git add css/style.css js/main.js
git commit -m "feat: visual system — type, grain, HUD, section styling, image fallback"
```

---

### Task 7: Scroll engine — Lenis, reveals, parallax

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `window.Lenis`, `window.gsap`, `window.ScrollTrigger` (Task 1); `.reveal` class (Task 6); `initAgeGate()` (Task 3).
- Produces: `initScroll()` — the single entry point that starts Lenis and registers all scroll behaviour; `prefersReduced()` helper returning `boolean`.

- [ ] **Step 1: Implement the reduced-motion branch first**

```js
function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```
`initScroll()` must return immediately (no Lenis, no `ScrollTrigger` instances) when `prefersReduced()` is true, after removing any `.reveal` start-state styles so all content is visible in normal flow.

- [ ] **Step 2: Start Lenis and bind it to ScrollTrigger**

```js
const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```
Call `ScrollTrigger.refresh()` after `lenis.on('scroll', ...)` and once more after `window` `load`. Anchor links (`href^="#"`) must call `lenis.scrollTo(target)` instead of jumping — and the handler must guard the target: if `document.querySelector(href)` is null (a stale link), scroll to top instead of leaving the user on a dead link.

- [ ] **Step 3: Generic reveals and parallax**

Reveals: every `.reveal` element animates `y: 32 → 0` and `opacity: 0 → 1` with `ease: 'power2.out'`, `duration: 1.1`, `scrollTrigger: { trigger, start: 'top 85%', once: true }`. Hero lines stagger by `0.08`s. Parallax: `[data-parallax]` elements scrub `yPercent` between `-12` and `12` with `scrub: true` bound to their section. `#sectionName` and `#chapterMarker` update from whichever section is at the viewport midline (`onEnter`/`onEnterBack`).

- [ ] **Step 4: Verify — Review Focus #2**

Reload normally: scroll through the page and screenshot at three depths; confirm reveals fire and nothing re-hides. Then reload with `prefers-reduced-motion` emulated (browser device/emulation, or set `document.body.classList` only if emulation is unavailable — prefer real emulation) and assert:
```js
() => ({ st: ScrollTrigger.getAll().length, flow: [...document.querySelectorAll('section')]
          .every(s => getComputedStyle(s).position !== 'sticky'),
        hidden: document.querySelectorAll('.reveal').length &&
          [...document.querySelectorAll('.reveal')].every(e => getComputedStyle(e).opacity === '1') })
```
Expected: `{ st: 0, flow: true, hidden: true }`, and the mobile screenshot shows all content readable in normal flow.

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "feat: Lenis smooth scroll, ScrollTrigger reveals, parallax, reduced-motion branch"
```

---

### Task 8: Pinned product chapters

**Files:**
- Modify: `js/main.js` (three `initChapter*` functions)
- Modify: `css/style.css` (pin layout + mobile fallback)
- Modify: `index.html` (only if a chapter needs extra inner structure)

**Interfaces:**
- Consumes: `initScroll()` (Task 7); section ids from Task 5; `PLUME_PRODUCTS` for spec rows.
- Produces: `initChapterOne()`, `initChapterArc()`, `initChapterReserve()` — each registering its own `ScrollTrigger` and returning nothing. All three are skipped entirely when `prefersReduced()` is true.

- [ ] **Step 1: Chapter 01 — PLUME ONE (stationary device, specs scrub past)**

Pin `#chapter-one` for `+=1600`; inside, scrub the device image `scale 1 → 1.08` while spec rows fade in one at a time at progress thresholds `.15/.35/.55/.75`, and the price reveals last. `scrub: true`, `pinSpacing: true`.

- [ ] **Step 2: Chapter 02 — PLUME ARC (horizontal colourway slide)**

Pin `#chapter-arc` for `+=1400`; translate an inner track `xPercent: -66` (3 colourway panels) with `scrub: true`, and cross-fade each panel's caption as its centre passes the viewport centre. Deliberately different choreography from Chapter 01.

- [ ] **Step 3: Chapter 03 — PLUME RESERVE (flavour cards advance)**

Pin `#chapter-reserve` for `+=1400`; the three flavour cards rise and stack (`y` from `80` to `-40 * index`, opacity to 1) as scrub progresses, with the tasting-note text cross-fading between flavours.

- [ ] **Step 4: Mobile pin fallback**

Below 768px, shorten every pin to `+=900`, and below 480px release `#chapter-arc`'s horizontal track entirely (it renders as a vertical stack with no `ScrollTrigger`). Re-run `ScrollTrigger.refresh()` after each `matchMedia` change.

- [ ] **Step 5: Verify — pin lifecycle and resize**

In the browser at 1440×900: scroll through each chapter and screenshot mid-pin and at pin release; assert each `.pin-spacer` exists while pinned and that normal flow resumes after (`document.querySelectorAll('.pin-spacer').length === 3` at rest is acceptable, but the pinned element's `transform` must be `none` after release).

Then resize the window to 1024px and assert `ScrollTrigger.getAll().every(t => t.scroll() <= t.end() + 1)` — no broken/NaN triggers — and `browser.console` shows no errors.

Repeat at 390×844: assert `#chapter-arc` has no horizontal transform applied and the page still scrolls end-to-end.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/style.css index.html
git commit -m "feat: three distinct pinned scroll chapters with mobile fallback"
```

---

### Task 9: Cart drawer and checkout

**Files:**
- Create: `js/cart.js`
- Modify: `index.html` (drawer + checkout markup if not already present from Task 5)
- Modify: `css/style.css` (drawer, overlay, form styles)
- Create: `tests/checkout-format.test.js`

**Interfaces:**
- Consumes: `createCartStore` (Task 2), `PLUME_PRODUCTS` (Task 2), `.is-gated`/overlay z-index conventions (Task 3).
- Produces: `initCart() -> void`; `formatMoney(cents) -> string`; `generateOrderNumber() -> string` matching `/^PLM-[A-Z0-9]{4}-\d{4}$/`; cart button badge `#cartCount` bound to `count()`.

- [ ] **Step 1: Write the failing helper test**

`tests/checkout-format.test.js` asserting:
- `formatMoney(6400) === '$64'`, `formatMoney(1850) === '$18.50'`, `formatMoney(0) === '$0'`
- `generateOrderNumber()` matches `/^PLM-[A-Z0-9]{4}-\d{4}$/` and the year segment equals the current year
- two consecutive calls differ (stub `Math.random` deterministically where needed)

Run: `node --test tests/checkout-format.test.js` → FAIL.

- [ ] **Step 2: Implement `formatMoney` and `generateOrderNumber` in `js/cart.js`**

Export both via the same dual `module.exports` / `globalThis` pattern used in Task 2 so Node can test them.

- [ ] **Step 3: Run the test**

Run: `node --test tests/checkout-format.test.js` → PASS.

- [ ] **Step 4: Build the drawer**

`initCart()` creates the store over `localStorage` (falling back to memory), opens the drawer on `#cartBtn`, closes on `✕`, `Escape`, or backdrop click. Drawer renders line items (name, variant label, `formatMoney` line total, `−`/`+` qty buttons, remove), a subtotal row, an empty state (`Your cart is empty.` + `Browse the range` link), and `Proceed to checkout`. Every `button[data-product]` on the page calls `store.add(...)`, animates the badge, and briefly opens the drawer.

- [ ] **Step 5: Wire persistence and badge binding**

Badge text = `store.count()`, hidden at `0`. `store.subscribe()` re-renders drawer and badge together so they cannot drift. Write-through happens inside `createCartStore`, so reload restores both — verify by adding an item, reloading, and asserting the badge and drawer contents match.

- [ ] **Step 6: Build checkout — Review Focus #5**

Overlay with fields `name`, `email`, `address`, `city`, `postcode`, `note`, plus an order summary. Client-side validation only: on submit, check required fields and a basic email pattern; invalid fields get an inline message and focus moves to the first invalid one — **and `store.items().length` must be unchanged**. Valid submit → `store.clear()`, overlay swaps to a confirmation panel showing `generateOrderNumber()`, `Order confirmed`, `Estimated delivery: 3–5 business days`, the demo note, and a `Continue` button returning to the page.

Assert after a failed submit: `() => cartStore.items().length` equals the pre-submit length, and the cart is still intact after reload.

- [ ] **Step 7: Verify the full flow end-to-end**

Age gate (already accepted) → add PLUME ONE (Graphite) and PLUME RESERVE (Vanilla Bourbon) → qty + on ONE → assert badge `3` and subtotal `$64 + $64 + $18` = `$146` → open checkout → submit empty → assert errors and cart intact → fill valid fields → submit → assert order number matches the pattern, cart cleared, badge `0` → reload → assert badge stays `0`.

Screenshot the open drawer and the confirmation panel at 1440×900 and 390×844.

- [ ] **Step 8: Commit**

```bash
git add js/cart.js index.html css/style.css tests/checkout-format.test.js
git commit -m "feat: cart drawer, checkout overlay, fake order confirmation"
```

---

### Task 10: Responsive pass and final verification

**Files:**
- Modify: `css/style.css`, `js/main.js`, `index.html` (fixes only)

**Interfaces:**
- Consumes: every prior task.
- Produces: nothing new — this task only corrects defects found.

- [ ] **Step 1: Run the whole test suite**

Run: `node --test` from `vape-showcase/`.
Expected: PASS, zero failures across all three test files.

- [ ] **Step 2: Assert the hard constraints objectively**

In the browser:
```js
() => ({
  canvases: document.querySelectorAll('canvas').length,
  network: performance.getEntriesByType('resource')
             .map(e => new URL(e.name).host)
             .filter(h => h && h !== location.host),
  cdnTags: [...document.querySelectorAll('script[src],link[href]')]
             .map(e => e.src || e.href)
             .filter(u => /^https?:/.test(u) && !u.startsWith(location.origin)),
  thirdPartyFetch: performance.getEntriesByType('resource')
                     .filter(e => !e.name.startsWith(location.origin)).length,
  deadAnchors: [...document.querySelectorAll('a[href^="#"]')]
                 .map(a => a.getAttribute('href'))
                 .filter(h => h.length > 1 && !document.querySelector(h))
})
```
Expected: `canvases: 0`, `network: []`, `cdnTags: []`, `thirdPartyFetch: 0`, `deadAnchors: []`. This proves the "no 3D", "no backend / no third-party requests", and "nav links never dead-end" constraints from spec §7.

- [ ] **Step 3: Screenshot sweep at both viewports**

At 1440×900 and 390×844, capture: hero, each of the three chapters mid-pin, range, craft, order CTA, footer, open drawer, checkout form, confirmation. Inspect each for clipped display type, overlapping text, illegible contrast, broken pinning, or horizontal overflow (`document.documentElement.scrollWidth <= innerWidth` must hold at both widths).

- [ ] **Step 4: Fix any defects found**

Each fix is a small, focused edit. If a defect suggests a design change rather than a bug, stop and raise it rather than improvising.

- [ ] **Step 5: Final regression**

Re-run Step 1, Step 2, and the screenshot sweep for any section touched.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: responsive and polish pass after full-site verification"
```
