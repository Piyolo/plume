'use strict';
/* Task 9 — checkout formatting and order numbers. Written before the
   implementation (Step 1 of the brief) so the helpers are pinned by
   behaviour rather than by whatever the code happens to do. */
const test = require('node:test');
const assert = require('node:assert/strict');

const { formatMoney, generateOrderNumber } = require('../js/cart.js');

test('formatMoney renders whole dollars without trailing zeros', () => {
  assert.equal(formatMoney(6400), '$64');
  assert.equal(formatMoney(2200), '$22');
  assert.equal(formatMoney(1800), '$18');
  assert.equal(formatMoney(0), '$0');
});

test('formatMoney keeps cents when they exist', () => {
  assert.equal(formatMoney(1850), '$18.50');
  assert.equal(formatMoney(5), '$0.05');
  assert.equal(formatMoney(100), '$1');
  assert.equal(formatMoney(123456), '$1234.56');
});

test('the order number matches the documented shape', () => {
  assert.match(generateOrderNumber(), /^PLM-[A-Z0-9]{4}-\d{4}$/);
});

test('the order number carries the current year', () => {
  const year = String(new Date().getFullYear());
  const segments = generateOrderNumber().split('-');
  assert.equal(segments[2], year);
});

test('two consecutive order numbers differ', () => {
  assert.notEqual(generateOrderNumber(), generateOrderNumber());
});

test('two order numbers differ even when Math.random is pinned to one value', () => {
  const real = Math.random;
  Math.random = () => 0.5;
  try {
    const first = generateOrderNumber();
    const second = generateOrderNumber();
    assert.notEqual(first, second,
      'a pinned Math.random must not be able to produce duplicate order numbers');
  } finally {
    Math.random = real;
  }
});
