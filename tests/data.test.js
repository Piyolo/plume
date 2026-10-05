'use strict';
/* Task 2 — product data. Written before js/data.js (TDD RED).
   Values are copied verbatim from spec §2. */
const test = require('node:test');
const assert = require('node:assert/strict');

const { products } = require('../js/data.js');

test('there are exactly three hero products', () => {
  assert.equal(products.length, 3);
});

test('product ids are in catalogue order', () => {
  assert.deepEqual(products.map((p) => p.id), ['plume-one', 'plume-arc', 'plume-reserve']);
});

test('prices are 6400, 2200 and 1800 cents', () => {
  assert.deepEqual(products.map((p) => p.priceCents), [6400, 2200, 1800]);
});

test('every product has at least three specs and one variant', () => {
  for (const p of products) {
    assert.ok(p.specs.length >= 3, `${p.id} has ${p.specs.length} specs`);
    assert.ok(p.variants.length >= 1, `${p.id} has no variants`);
    for (const s of p.specs) {
      assert.ok(typeof s.k === 'string' && s.k.length > 0, `${p.id} spec missing key`);
      assert.ok(typeof s.v === 'string' && s.v.length > 0, `${p.id} spec missing value`);
    }
  }
});

test('variant labels are exactly as specified', () => {
  const labels = Object.fromEntries(products.map((p) => [p.id, p.variants.map((v) => v.label)]));
  assert.deepEqual(labels['plume-one'], ['Graphite', 'Silver', 'Ember']);
  assert.deepEqual(labels['plume-arc'], ['Onyx', 'Chalk', 'Gold']);
  assert.deepEqual(labels['plume-reserve'], ['Blackcurrant Mint', 'Vanilla Bourbon', 'Citrus Ice']);
});

test('every variant carries an id and a hex colour', () => {
  for (const p of products) {
    for (const v of p.variants) {
      assert.ok(typeof v.id === 'string' && v.id.length > 0, `${p.id} variant missing id`);
      assert.match(v.color, /^#[0-9A-Fa-f]{6}$/, `${p.id}/${v.id} colour is not a hex triplet`);
    }
  }
});

test('images point into assets/img/', () => {
  for (const p of products) {
    assert.ok(p.image.startsWith('assets/img/'), `${p.id} image is not local`);
    assert.ok(p.detailImage.startsWith('assets/img/'), `${p.id} detailImage is not local`);
    assert.ok(p.image !== p.detailImage, `${p.id} reuses one image for both slots`);
  }
});

test('chapters run 01, 02, 03', () => {
  assert.deepEqual(products.map((p) => p.chapter), ['01', '02', '03']);
});

test('every product has a tagline and a description', () => {
  for (const p of products) {
    assert.equal(typeof p.tagline, 'string');
    assert.ok(p.tagline.length > 0, `${p.id} has no tagline`);
    assert.equal(typeof p.description, 'string');
    assert.ok(p.description.length > 20, `${p.id} description is too short to be copy`);
  }
});
