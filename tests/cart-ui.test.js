'use strict';
/* Task 9 — cart drawer and checkout. The behavioural proof was the in-browser
   end-to-end run (add, qty, validate, order, persist). These lock in the
   properties that run depended on and that are easy to undo by accident. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const cart = read('js/cart.js');
const main = read('js/main.js');
const html = read('index.html');
const css = read('css/style.css');

test('initCart is wired into the boot sequence after the scroll engine', () => {
  assert.match(main, /initScroll\(\);\s*initCart\(\);/);
  assert.match(cart, /function initCart\(\)/);
});

test('the badge and the drawer are written from a single render pass', () => {
  const render = cart.slice(cart.indexOf('function render()'), cart.indexOf('function bumpBadge'));
  assert.match(render, /badge\.textContent/);
  assert.match(render, /badge\.hidden = count === 0/);
  assert.match(render, /emptyState\.hidden = !empty/);
  assert.match(render, /subtotalEl\.textContent/);
  assert.match(render, /summaryTotal\.textContent/);
  assert.match(render, /checkoutBtn\.disabled = empty/);
  assert.match(cart, /store\.subscribe\(render\)/,
    'both surfaces must repaint from one subscription so they cannot drift');
});

test('a failed submit returns before the store is touched', () => {
  const submit = cart.slice(cart.indexOf("form.addEventListener('submit'"), cart.indexOf('if (continueAfter)'));
  const bail = submit.indexOf('if (firstBad)');
  const clearCall = submit.indexOf('store.clear()');
  assert.ok(bail > -1, 'no firstBad branch');
  assert.ok(clearCall > bail, 'store.clear() must come after the validation bail-out');
  assert.match(submit, /firstBad\.focus\(\)/);
});

test('all five required fields and an email pattern are validated', () => {
  assert.match(cart, /REQUIRED_FIELDS = \['name', 'email', 'address', 'city', 'postcode'\]/);
  assert.match(cart, /EMAIL_PATTERN = \/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//);
  assert.match(cart, /markInvalid\(input, 'This field is required\.'\)/);
  assert.match(cart, /markInvalid\(input, 'Enter a valid email address\.'\)/);
});

test('an empty cart cannot reach the order confirmation', () => {
  const submit = cart.slice(cart.indexOf("form.addEventListener('submit'"), cart.indexOf('if (continueAfter)'));
  assert.ok(submit.indexOf('if (store.count() === 0)') > -1);
});

test('storage access cannot throw at the visitor', () => {
  assert.match(cart, /function safeStorage\(\)\s*\{[\s\S]*?try\s*\{[\s\S]*?catch/);
  assert.match(cart, /createCartStore\(safeStorage\(\)\)/);
});

test('the drawer opens, and closes on the button, the scrim and Escape', () => {
  assert.match(cart, /cartBtn\.addEventListener\('click', openDrawer\)/);
  assert.match(cart, /cartClose\.addEventListener\('click', closeDrawer\)/);
  assert.match(cart, /scrim\.addEventListener\('click', closeDrawer\)/);
  assert.match(cart, /event\.key !== 'Escape'/);
});

test('scroll lock is a dedicated state, not a reuse of the age-gate class', () => {
  assert.match(css, /body\.is-locked\s*\{\s*overflow:\s*hidden/);
  assert.match(cart, /classList\.toggle\('is-locked', locked\)/);
  const setLock = cart.slice(cart.indexOf('function setLock'));
  assert.ok(!/classList\.(add|remove)\('is-gated'\)/.test(setLock),
    'the cart must never toggle the age-gate class');
});

test('the scrim exists, sits between the HUD and the drawer, and starts hidden', () => {
  assert.match(html, /<div class="scrim" id="cartScrim" hidden>/);
  assert.match(css, /\.scrim\s*\{[^}]*z-index:\s*55/);
  assert.match(css, /--z-hud:\s*50/);
  assert.match(css, /\.drawer\s*\{[^}]*z-index:\s*var\(--z-drawer\)/);
});

test('per-field inline messages and the badge bump are styled', () => {
  assert.match(css, /\.field__msg\s*\{[^}]*color:/);
  assert.ok(!/\.field__msg\s*\{[^}]*--ember/.test(css),
    'spec §4 forbids ember as UI, including error text');
  assert.match(css, /@keyframes badge-bump/);
  assert.match(css, /\.hud__count\.is-bump\s*\{\s*animation:/);
});

test('variant chips drive the add button so a specific variant can be ordered', () => {
  assert.match(cart, /closest\('\.swatches'\)/);
  assert.match(cart, /host\.querySelector\('button\.add\[data-product\]'\)/);
  assert.match(cart, /setAttribute\('data-variant'/);
});

test('the module exports stay dual so Node and the page can both use them', () => {
  const exported = require('../js/cart.js');
  assert.equal(typeof exported.formatMoney, 'function');
  assert.equal(typeof exported.generateOrderNumber, 'function');
  assert.equal(typeof exported.initCart, 'function');
  assert.match(cart, /globalThis\.initCart = initCart/);
});
