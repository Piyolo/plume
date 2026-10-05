'use strict';
/* Stored cart data is untrusted — hand-edited, left by an older build, or
   truncated. These cover the two ways that used to go wrong: a corrupt value
   permanently disabling persistence, and a nonsense line producing a negative
   badge or fractional cents. */
const test = require('node:test');
const assert = require('node:assert/strict');

const { createCartStore, PLUME_CART_KEY } = require('../js/cart-store.js');
const { formatMoney, generateOrderNumber } = require('../js/cart.js');

function fakeStorage(initial) {
  const data = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    raw: data,
  };
}

const ONE = { id: 'plume-one', name: 'PLUME ONE', priceCents: 6400 };
const RESERVE = { id: 'plume-reserve', name: 'PLUME RESERVE', priceCents: 1800 };
const line = (over) => Object.assign({
  id: 'plume-one::graphite', name: 'PLUME ONE', variant: 'graphite', unitPrice: 6400, qty: 1,
}, over);

test('truncated JSON starts empty and then self-heals', () => {
  const storage = fakeStorage({ [PLUME_CART_KEY]: '[{"id":"a"' });
  const store = createCartStore(storage);

  assert.deepEqual(store.items(), [], 'a corrupt value must not produce lines');

  store.add(ONE, 'graphite');
  const written = storage.getItem(PLUME_CART_KEY);
  assert.ok(written, 'nothing was written');
  assert.doesNotThrow(() => JSON.parse(written), 'the corrupt value was not overwritten');

  // the whole point: the cart works again on the next load
  const reloaded = createCartStore(storage);
  assert.equal(reloaded.count(), 1);
  assert.equal(reloaded.subtotal(), 6400);
});

test('a non-array payload is treated as empty and still persists', () => {
  for (const junk of ['"hello"', '{"a":1}', '42', 'null']) {
    const storage = fakeStorage({ [PLUME_CART_KEY]: junk });
    const store = createCartStore(storage);
    assert.deepEqual(store.items(), [], `${junk} produced lines`);
    store.add(RESERVE, 'citrus-ice');
    assert.equal(createCartStore(storage).count(), 1, `${junk} did not self-heal`);
  }
});

test('lines with impossible quantities or prices are rejected', () => {
  const storage = fakeStorage({
    [PLUME_CART_KEY]: JSON.stringify([
      line({ qty: -5 }),
      line({ id: 'plume-arc::onyx', variant: 'onyx', unitPrice: 2200, qty: 0 }),
      line({ id: 'plume-arc::gold', variant: 'gold', unitPrice: 22.5, qty: 1 }),
      line({ id: 'plume-arc::chalk', variant: 'chalk', unitPrice: 2200, qty: 1.5 }),
      line({ unitPrice: -100 }),
      line({ id: 'plume-reserve::x', variant: 'x', unitPrice: '1800', qty: 1 }),
    ]),
  });
  const store = createCartStore(storage);
  assert.deepEqual(store.items(), [], 'nonsense lines survived validation');
  assert.equal(store.count(), 0);
  assert.equal(store.subtotal(), 0);
});

test('duplicate line ids are merged so neither can become unremovable', () => {
  const storage = fakeStorage({
    [PLUME_CART_KEY]: JSON.stringify([line({ qty: 2 }), line({ qty: 3 })]),
  });
  const store = createCartStore(storage);

  assert.equal(store.items().length, 1, 'duplicate rows would render twice');
  assert.equal(store.count(), 5);
  assert.equal(store.subtotal(), 5 * 6400);

  store.remove('plume-one::graphite');
  assert.equal(store.count(), 0, 'the merged line must be fully removable');
});

test('an absurd stored quantity is capped', () => {
  const storage = fakeStorage({
    [PLUME_CART_KEY]: JSON.stringify([line({ qty: 4000 }), line({ qty: 4000 })]),
  });
  const store = createCartStore(storage);
  assert.ok(store.count() <= 99, `count was ${store.count()}`);
});

test('setQty clamps instead of storing a negative or fractional quantity', () => {
  const store = createCartStore(fakeStorage());
  store.add(ONE, 'graphite');

  store.setQty('plume-one::graphite', 2.7);
  assert.equal(store.items()[0].qty, 3);

  store.setQty('plume-one::graphite', 5000);
  assert.ok(store.items()[0].qty <= 99);

  store.setQty('plume-one::graphite', 0);
  assert.equal(store.count(), 0, 'zero must remove the line');
});

test('the whole money and order surface behaves, including untested branches', () => {
  assert.equal(formatMoney(-6400), '-$64');
  assert.equal(formatMoney(-1850), '-$18.50');
  assert.equal(formatMoney(NaN), '$0');
  assert.equal(formatMoney(undefined), '$0');

  // the injectable clock is what makes the year segment testable
  assert.match(generateOrderNumber(new Date('1999-05-05T00:00:00Z')),
    /^PLM-[A-Z0-9]{4}-1999$/);
});

test('the badge never renders a negative count from any stored state', () => {
  const storage = fakeStorage({
    [PLUME_CART_KEY]: JSON.stringify([line({ qty: -3 }), line({ qty: 2 })]),
  });
  const store = createCartStore(storage);
  assert.ok(store.count() >= 0);
  assert.equal(String(store.count()), '2');
});
