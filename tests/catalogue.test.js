'use strict';
/* Task 5 — the markup cannot disagree with the catalogue.
   Prices and variants are declared twice (index.html + js/data.js); this
   makes sure the two can never drift apart. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { products } = require('../js/data.js');
const byId = Object.fromEntries(products.map((p) => [p.id, p]));

test('every add-to-cart button matches its product price and offers a real variant', () => {
  const buttons = [...html.matchAll(/<button[^>]*data-product="([^"]+)"[^>]*>/g)]
    .map((m) => m[0]);

  assert.ok(buttons.length >= 6, `expected >= 6 add buttons, found ${buttons.length}`);

  for (const tag of buttons) {
    const id = tag.match(/data-product="([^"]+)"/)[1];
    const variant = (tag.match(/data-variant="([^"]+)"/) || [])[1];
    const price = (tag.match(/data-price="([^"]+)"/) || [])[1];

    assert.ok(byId[id], `button references unknown product ${id}`);
    assert.ok(variant, `${id} button has no data-variant`);
    assert.ok(byId[id].variants.some((v) => v.id === variant),
      `${id} button offers unknown variant ${variant}`);
    assert.ok(price, `${id} button has no data-price`);
    assert.equal(Number(price), byId[id].priceCents,
      `${id} button says ${price} but the catalogue says ${byId[id].priceCents}`);
  }
});

test('the only prices in the document are the three catalogue prices', () => {
  const found = [...new Set([...html.matchAll(/data-price="(\d+)"/g)].map((m) => Number(m[1])))];
  assert.deepEqual(found.sort((a, b) => a - b), [1800, 2200, 6400]);
});

test('every range card shows its product image and name', () => {
  for (const p of products) {
    const card = html.match(new RegExp(`<article[^>]*data-card="${p.id}"[\\s\\S]*?</article>`));
    assert.ok(card, `no range card for ${p.id}`);
    assert.ok(card[0].includes(`src="${p.image}"`), `${p.id} card does not show ${p.image}`);
    assert.ok(card[0].includes(p.name), `${p.id} card does not name the product`);
  }
});

test('the three chapter sections are the three products, in catalogue order', () => {
  const ids = ['chapter-one', 'chapter-arc', 'chapter-reserve'];
  const productIds = ['plume-one', 'plume-arc', 'plume-reserve'];
  ids.forEach((sid, i) => {
    const sec = html.match(new RegExp(`<section id="${sid}"[\\s\\S]*?</section>`));
    assert.ok(sec, `missing section ${sid}`);
    assert.ok(sec[0].includes(`data-product="${productIds[i]}"`), `${sid} is not ${productIds[i]}`);
    assert.ok(sec[0].includes('assets/img/'), `${sid} has no imagery`);
  });
});

test('the footer carries every disclaimer the spec requires', () => {
  assert.ok(html.includes('This is a design demo. No products are sold and no order is placed.'));
  assert.ok(html.includes('21+ only. Nicotine is an addictive substance.'));
  assert.ok(html.includes('Not affiliated with any real brand.'));
});

test('the document has no dead in-page links', () => {
  const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  for (const h of hrefs) {
    assert.ok(new RegExp(`id="${h}"`).test(html), `link to missing #${h}`);
  }
});
