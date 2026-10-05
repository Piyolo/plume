'use strict';
/* Task 6 — the visual system's load-bearing rules. The same invariants were
   measured in-page at 1440x900, 834x1112 and 390x844; this keeps them from
   regressing between visual checks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

test('the grain layer and HUD sit on the z-scale decided in the pre-flight scan', () => {
  assert.match(css, /\.grain\s*\{[^}]*z-index:\s*var\(--z-grain\)/);
  assert.match(css, /\.hud\s*\{[^}]*z-index:\s*var\(--z-hud\)/);
  assert.match(css, /--z-grain:\s*40/);
  assert.match(css, /--z-hud:\s*50/);
});

test('hidden elements really are hidden despite later display rules', () => {
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test('.reveal starts hidden for Task 7 to animate in', () => {
  assert.match(css, /\.reveal\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(32px\)/);
});

test('.is-plate is a real treatment: vapour texture plus typographic label', () => {
  assert.match(css, /\.is-plate\s*\{[^}]*url\('\.\.\/assets\/img\/texture-plate\.jpg'\)/);
  assert.match(css, /\.is-plate::after\s*\{[^}]*content:\s*attr\(data-plate-label\)/);
  assert.match(css, /\.is-plate\s*>\s*img\s*\{\s*visibility:\s*hidden/);
});

test('main.js wires the capture-phase error listener that makes .is-plate work', () => {
  assert.match(js, /document\.addEventListener\('error',\s*onError,\s*true\)/);
  assert.match(js, /initImageFallback\(\)/);
});

test('the range grid has three explicit breakpoints: 3 / 2 / 1 columns', () => {
  const base = css.match(/\.range__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,[^}]*\}/);
  assert.ok(base, 'no 3-column base rule');
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.range__grid\s*\{[^}]*repeat\(2,/);
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*?\.range__grid\s*\{[^}]*1fr/);
});

test('chapters drop to one column below 768px and the arc track below 480px', () => {
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?#?\.chapter\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.chapter__media\s*\{[^}]*position:\s*static/);
  assert.match(css, /@media \(max-width: 479px\)[\s\S]*?\.arc-track\s*\{[^}]*display:\s*none/);
});

test('the HUD sheds its centre label before its cart button', () => {
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*?\.hud__section\s*\{[^}]*display:\s*none/);
  assert.ok(!/\.hud__cart\s*\{[^}]*display:\s*none/.test(css), 'the cart button must never be hidden');
});

test('reduced motion releases the reveals and all transforms', () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*$/);
  assert.ok(block, 'no reduced-motion block');
  assert.match(block[0], /\.reveal\s*\{[^}]*opacity:\s*1\s*!important/);
  assert.match(block[0], /\.reveal\s*\{[^}]*transform:\s*none\s*!important/);
});
