'use strict';
/* Task 8 — the pinned chapters. The behavioural proof was the in-browser run
   (spec reveal, colourway slide, flavour deck, Lenis limit). These keep a
   future edit from silently reintroducing the two failure modes we hit:
   content taller than its viewport being pinned, and a stale scroll limit. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

test('three distinct chapter initialisers exist and are wired into initScroll', () => {
  for (const fn of ['initChapterOne', 'initChapterArc', 'initChapterReserve']) {
    assert.match(js, new RegExp('function ' + fn + '\\('), fn + ' is missing');
    assert.match(js, new RegExp(fn + '\\(\\);'), fn + ' is never called');
  }
  // deliberately different choreography, not one shared routine
  assert.match(js, /scale: 1\.08/, 'chapter one must scale its device');
  assert.match(js, /xPercent: -66\.6667/, 'chapter arc must slide its colourway track');
  assert.match(js, /y: -40 \* i/, 'chapter reserve must stack its flavour cards');
});

test('every chapter is skipped entirely under reduced motion', () => {
  for (const fn of ['initChapterOne', 'initChapterArc', 'initChapterReserve']) {
    const body = js.slice(js.indexOf('function ' + fn));
    assert.match(body.slice(0, 120), /if \(prefersReduced\(\)\) return;/,
      fn + ' must bail out on reduced motion before creating anything');
  }
});

test('the pin frame is gated on a JS-added class, so no-JS never clips content', () => {
  assert.match(css, /\.chapter\.is-pinned\s*\{\s*height:\s*100vh;\s*overflow:\s*hidden/);
  assert.match(js, /classList\.add\('is-pinned'\)/);
  assert.match(js, /classList\.remove\('is-pinned'\)/);
  assert.match(js, /clearProps: 'all'/);
});

test('ScrollTrigger owns pinning — no native sticky on chapter media', () => {
  const media = css.match(/\.chapter__media\s*\{[^}]*\}/)[0];
  assert.ok(!/position:\s*sticky/.test(media),
    'spec §7 resolves Lenis-vs-sticky by letting ScrollTrigger own pinning');
  assert.ok(!/\.chapter__media\s*\{[^}]*position:\s*sticky/.test(css));
});

test('the colourway track is three times its container so -66.667 lands on panel 3', () => {
  assert.match(css, /\.arc-track__inner\s*\{[^}]*grid-template-columns:\s*repeat\(3, 1fr\)/);
  assert.match(css, /\.arc-track__inner\s*\{[^}]*width:\s*300%/);
});

test('each chapter gets a substantial pin distance', () => {
  /* Asserts a floor, not the plan's exact numbers: rebalancing pin distances
     is a design change, not a regression, and must not require editing a test. */
  const distances = [...js.matchAll(/chapterFrame\(section, (\d+)\)/g)].map((m) => Number(m[1]));
  assert.equal(distances.length, 3, 'all three chapters should be framed');
  for (const d of distances) {
    assert.ok(d >= 900, `pin distance ${d}px is too short to choreograph anything`);
  }
  assert.match(js, /pin:\s*true,\s*pinSpacing:\s*true,\s*scrub:\s*true/);
});

test('below 768px nothing is pinned and the track is only tweened when visible', () => {
  assert.match(js, /matchMedia\(\)\.add\('\(min-width: 768px\)'/);
  assert.match(js, /matchMedia\(\)\.add\('\(max-width: 767px\)'/);
  assert.match(js, /track\.offsetParent === null/);
  assert.match(css, /@media \(max-width: 479px\)[\s\S]*?\.arc-track\s*\{[^}]*display:\s*none/);
});

test('Lenis is re-measured after the pins add their spacer height', () => {
  assert.match(js, /ScrollTrigger\.refresh\(\);\s*lenis\.resize\(\);/,
    'a stale Lenis limit makes the bottom of the page unreachable');
  assert.match(js, /ScrollTrigger\.refresh\(\);\s*lenis\.resize\(\);/);
});

test('the copy column is scrubbed so the tail of a tall chapter stays reachable', () => {
  assert.match(js, /function chapterOverflow\(section, copy\)/);
  assert.match(js, /Math\.max\(0, Math\.round\(copy\.offsetHeight - avail\)\)/);
  /* Resolved as a function, not a number captured at DOMContentLoaded: the
     display font has not swapped in yet, so a captured value is a line short. */
  assert.match(js, /y: function \(\) \{ return -chapterOverflow\(section, copy\); \}/);
  assert.match(js, /duration: 1,\s*\n\s*\}, 0\);/);
  assert.match(js, /invalidateOnRefresh: true/);
});

test('the pin frame budget keeps the media column inside 100vh', () => {
  const detail = css.match(/\.chapter__detail\s*\{[^}]*\}/)[0];
  assert.match(detail, /height:\s*min\(/,
    'the detail image must take only what is left of the frame budget');
  assert.match(detail, /calc\(100vh - 2 \* var\(--section-pad\)/);
});
