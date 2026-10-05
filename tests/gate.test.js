'use strict';
/* Regression guard for the age gate (Task 3).
   The behavioural proof was the in-browser run (gate absent → present →
   dismissed → persisted). This keeps Tasks 5 and 9 from silently rewriting
   the markup or the boot order out from under it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const js = read('js/main.js');
const css = read('css/style.css');

test('the gate markup exists as the first element of body', () => {
  assert.match(html, /<body>\s*<!-- =+ AGE GATE/);
  assert.match(html, /id="ageGate"/);
  assert.ok(html.indexOf('id="ageGate"') < html.indexOf('id="hero"') || !html.includes('id="hero"'),
    'the gate must precede the content it gates');
});

test('the gate has an accept path, a decline path and a way back', () => {
  assert.match(html, /id="gateYes"/);
  assert.match(html, /id="gateNo"/);
  assert.match(html, /id="gateBack"/);
  assert.match(html, /id="gateRefuse"[^>]*hidden|hidden[^>]*id="gateRefuse"/);
});

test('the gate copies are exact', () => {
  assert.ok(html.includes('Are you 21 or older?'), 'missing the age question');
  assert.ok(html.includes('Come back when'), 'missing the refusal state');
  assert.ok(html.includes('This site contains content about nicotine products.'), 'missing the sub-line');
});

test('boot runs initAgeGate and persists under the pinned key', () => {
  assert.match(js, /PLUME_AGE_KEY = 'plume\.age'/);
  assert.match(js, /initAgeGate\(\)/);
  assert.match(js, /document\.body\.classList\.add\('is-gated'\)/);
  assert.match(js, /document\.body\.classList\.remove\('is-gated'\)/);
  // storage access must be guarded, never allowed to throw at the user
  assert.match(js, /try\s*\{[\s\S]*localStorage[\s\S]*\}\s*catch/, 'localStorage access is unguarded');
});

test('the gate stacks above everything and locks scroll while open', () => {
  assert.match(css, /\.is-gated\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.gate\s*\{[^}]*z-index:\s*var\(--z-gate\)/);
  assert.match(css, /--z-gate:\s*90/);
});
