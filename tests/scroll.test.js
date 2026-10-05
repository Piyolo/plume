'use strict';
/* Task 7 — the scroll engine's guarantees. The behavioural proof was the
   in-browser run (reveals 0 → 1, HUD sync, anchor guard, reduced branch).
   These keep a future edit from quietly removing the accessibility branch
   or loosening the animation spec. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

test('prefersReduced reads the real media query', () => {
  assert.match(js, /function prefersReduced\(\)/);
  assert.match(js, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
});

test('initScroll returns before constructing Lenis when motion is reduced', () => {
  const reduced = js.indexOf('if (prefersReduced())');
  const lenis = js.indexOf('new window.Lenis');
  assert.ok(reduced > 0, 'no reduced-motion branch');
  assert.ok(lenis > reduced,
    'Lenis must be constructed only after the reduced-motion early return');
});

test('the reduced branch forces every reveal visible and creates no ScrollTrigger', () => {
  const branch = js.slice(reducedSliceStart(js), js.indexOf('/* --- Step 2'));
  assert.match(branch, /style\.opacity = '1'/);
  assert.match(branch, /style\.transform = 'none'/);
  assert.match(branch, /return;/);
  assert.ok(!/ScrollTrigger\.create/.test(branch), 'reduced branch must create no triggers');
});

test('reveals are one-shot so content can never re-hide', () => {
  assert.match(js, /scrollTrigger: \{ trigger: el, start: 'top 85%', once: true \}/);
  assert.match(js, /ease: 'power2\.out'/);
  assert.match(js, /duration: 1\.1/);
});

test('parallax is scrubbed, bounded to ±12 and scoped to its own section', () => {
  assert.match(js, /gsap\.fromTo\(el, \{ yPercent: -12 \}, \{\s*yPercent: 12,/);
  assert.match(js, /scrub: true/);
  assert.match(js, /el\.closest\('section'\)/);
});

test('anchor clicks guard a stale href instead of dying on a dead link', () => {
  assert.match(js, /document\.addEventListener\('click'/);
  assert.match(js, /querySelector\(href\)/);
  assert.match(js, /lenis\.scrollTo\(target \|\| 0/);
});

test('the HUD reads the section marker element and the boot calls initScroll', () => {
  assert.match(js, /section\.querySelector\('\[data-marker\]'\)/);
  assert.match(js, /initScroll\(\);/);
});

function reducedSliceStart(src) {
  const i = src.indexOf('if (prefersReduced())');
  assert.ok(i > 0, 'no reduced-motion branch');
  return i;
}
