'use strict';
/* Task 2 — cart store. Written before js/cart-store.js (TDD RED). */
const test = require('node:test');
const assert = require('node:assert/strict');

const { createCartStore } = require('../js/cart-store.js');

const KEY = 'plume.cart';
const A = { id: 'plume-one', name: 'PLUME ONE', priceCents: 6400 };
const B = { id: 'plume-reserve', name: 'PLUME RESERVE', priceCents: 1800 };

function memoryStorage(seed) {
  const map = new Map();
  if (seed !== undefined) map.set(KEY, seed);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    _map: map,
  };
}

test('add() creates one line carrying the id (productId::variant), qty 1 and the product snapshot', () => {
  const store = createCartStore(memoryStorage());
  store.add(A, 'graphite');

  const lines = store.items();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].id, 'plume-one::graphite');
  assert.equal(lines[0].variant, 'graphite');
  assert.equal(lines[0].qty, 1);
  assert.equal(lines[0].name, 'PLUME ONE');
  assert.equal(lines[0].unitPrice, 6400);
});

test('add() twice for the same product+variant increments qty instead of duplicating', () => {
  const store = createCartStore(memoryStorage());
  store.add(A, 'graphite');
  store.add(A, 'graphite');

  const lines = store.items();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].qty, 2);
});

test('setQty() sets the quantity and subtotal() reflects qty * priceCents', () => {
  const store = createCartStore(memoryStorage());
  store.add(A, 'graphite');
  store.setQty('plume-one::graphite', 4);

  assert.equal(store.items()[0].qty, 4);
  assert.equal(store.subtotal(), 4 * 6400);
});

test('setQty() with 0 or a negative number removes the line', () => {
  const zero = createCartStore(memoryStorage());
  zero.add(A, 'graphite');
  zero.setQty('plume-one::graphite', 0);
  assert.equal(zero.items().length, 0);

  const negative = createCartStore(memoryStorage());
  negative.add(A, 'graphite');
  negative.setQty('plume-one::graphite', -1);
  assert.equal(negative.items().length, 0);
});

test('count() equals the sum of line quantities after a mixed sequence', () => {
  const store = createCartStore(memoryStorage());
  store.add(A, 'graphite');
  store.add(B, 'vanilla-bourbon');
  store.add(A, 'graphite');
  store.setQty('plume-one::graphite', 4);
  store.remove('plume-reserve::vanilla-bourbon');

  assert.equal(store.count(), 4);
  assert.equal(store.subtotal(), 4 * 6400);
});

test('clear() empties items, count and subtotal', () => {
  const store = createCartStore(memoryStorage());
  store.add(A, 'graphite');
  store.add(B, 'citrus-ice');
  store.clear();

  assert.deepEqual(store.items(), []);
  assert.equal(store.count(), 0);
  assert.equal(store.subtotal(), 0);
});

test('a second store over the same storage restores the persisted cart', () => {
  const storage = memoryStorage();
  const first = createCartStore(storage);
  first.add(A, 'graphite');
  first.add(A, 'graphite');
  first.add(B, 'citrus-ice');

  const second = createCartStore(storage);
  assert.equal(second.items().length, 2);
  assert.equal(second.count(), 3);
  assert.equal(second.subtotal(), 2 * 6400 + 1800);
});

test('a throwing getItem falls back to memory without raising', () => {
  const storage = {
    getItem() { throw new Error('storage blocked'); },
    setItem() { throw new Error('storage blocked'); },
  };

  const store = createCartStore(storage);
  assert.deepEqual(store.items(), []);
  assert.doesNotThrow(() => store.add(A, 'graphite'));
  assert.doesNotThrow(() => store.setQty('plume-one::graphite', 3));
  assert.equal(store.items()[0].qty, 3);
  assert.equal(store.count(), 3);
});

test('a throwing setItem still lets mutations succeed (Review Focus #1)', () => {
  const storage = {
    getItem: () => null,
    setItem() { throw new Error('QuotaExceededError'); },
  };

  const store = createCartStore(storage);
  assert.doesNotThrow(() => store.add(A, 'graphite'));
  assert.doesNotThrow(() => store.add(B, 'citrus-ice'));
  assert.doesNotThrow(() => store.clear());
  assert.deepEqual(store.items(), []);
});

test('subscribe() fires once per mutation and unsubscribe() stops further calls', () => {
  const store = createCartStore(memoryStorage());
  let calls = 0;
  const off = store.subscribe(() => { calls += 1; });

  store.add(A, 'graphite');
  assert.equal(calls, 1, 'add() should notify once');

  store.add(A, 'graphite');
  assert.equal(calls, 2, 'a second add() should notify once');

  store.setQty('plume-one::graphite', 5);
  assert.equal(calls, 3, 'setQty() should notify once');

  store.remove('plume-one::graphite');
  assert.equal(calls, 4, 'remove() should notify once');

  store.clear();
  assert.equal(calls, 5, 'clear() should notify once');

  off();
  store.add(B, 'citrus-ice');
  assert.equal(calls, 5, 'an unsubscribed listener must not be called');
});
