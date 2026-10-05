'use strict';
/* Task 4 — the assets exist, are real JPEGs, and every path the catalogue
   references actually resolves on disk. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const imgDir = path.join(root, 'assets', 'img');
const { products } = require('../js/data.js');

const REQUIRED = [
  'hero-device.jpg', 'manifesto-plate.jpg',
  'one-hero.jpg', 'one-detail.jpg',
  'arc-hero.jpg', 'arc-detail.jpg',
  'reserve-hero.jpg', 'reserve-detail.jpg',
  'craft-01.jpg', 'craft-02.jpg',
  'texture-plate.jpg',
];

test('all 11 slots were downloaded', () => {
  for (const f of REQUIRED) {
    assert.ok(fs.existsSync(path.join(imgDir, f)), `missing assets/img/${f}`);
  }
});

test('every asset is a real JPEG heavier than 20 KB', () => {
  for (const f of REQUIRED) {
    const p = path.join(imgDir, f);
    const fd = fs.openSync(p, 'r');
    const head = Buffer.alloc(3);
    fs.readSync(fd, head, 0, 3, 0);
    fs.closeSync(fd);
    assert.deepEqual([...head], [0xff, 0xd8, 0xff], `${f} is not a JPEG`);
    assert.ok(fs.statSync(p).size > 20000, `${f} is suspiciously small`);
  }
});

test('every image path the catalogue references exists', () => {
  for (const p of products) {
    for (const field of ['image', 'detailImage']) {
      const rel = p[field];
      assert.ok(fs.existsSync(path.join(root, rel)), `${p.id}.${field} -> ${rel} missing`);
    }
  }
});

test('the texture plate exists (it is the .is-plate fallback background)', () => {
  const plate = fs.readFileSync(path.join(imgDir, 'texture-plate.jpg'));
  assert.deepEqual([...plate.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.ok(plate.length > 20000, 'texture-plate.jpg is too small to be a usable backdrop');
});
