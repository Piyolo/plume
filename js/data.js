'use strict';
/* ==========================================================================
   PLUME — product catalogue
   Single source of truth: the range grid, the pinned chapters and the cart
   all read from here, so a price can never drift between page and receipt.
   Spec: docs/superpowers/specs/...-design.md §2
   ========================================================================== */

var PLUME_PRODUCTS = [
  {
    id: 'plume-one',
    name: 'PLUME ONE',
    tagline: 'Weighted, sealed, silent.',
    priceCents: 6400,
    description: 'A refillable pod system machined from a single billet of aluminium, tuned for a draw that never wanders.',
    image: 'assets/img/one-hero.jpg',
    detailImage: 'assets/img/one-detail.jpg',
    chapter: '01',
    specs: [
      { k: 'BATTERY', v: '900 mAh' },
      { k: 'CHARGE', v: 'USB-C · 45 min' },
      { k: 'POD', v: '2 ml refillable' },
      { k: 'WEIGHT', v: '48 g' },
    ],
    variants: [
      { id: 'graphite', label: 'Graphite', color: '#3A3A3C' },
      { id: 'silver', label: 'Silver', color: '#C7C7CC' },
      { id: 'ember', label: 'Ember', color: '#D9482B' },
    ],
  },
  {
    id: 'plume-arc',
    name: 'PLUME ARC',
    tagline: 'Six hundred draws, no buttons.',
    priceCents: 2200,
    description: 'A sealed ten-millilitre device that ships charged, draws soft, and disappears into a pocket.',
    image: 'assets/img/arc-hero.jpg',
    detailImage: 'assets/img/arc-detail.jpg',
    chapter: '02',
    specs: [
      { k: 'E-LIQUID', v: '10 ml' },
      { k: 'PUFFS', v: '≈ 600' },
      { k: 'NICOTINE', v: '20 mg/ml' },
      { k: 'WEIGHT', v: '32 g' },
    ],
    variants: [
      { id: 'onyx', label: 'Onyx', color: '#141416' },
      { id: 'chalk', label: 'Chalk', color: '#EDEDE8' },
      { id: 'gold', label: 'Gold', color: '#E8B84B' },
    ],
  },
  {
    id: 'plume-reserve',
    name: 'PLUME RESERVE',
    tagline: 'Steeped small. Poured slow.',
    priceCents: 1800,
    description: 'Three nicotine-salt blends steeped in small batches and bottled the week they are ready.',
    image: 'assets/img/reserve-hero.jpg',
    detailImage: 'assets/img/reserve-detail.jpg',
    chapter: '03',
    specs: [
      { k: 'NICOTINE', v: '20 mg/ml' },
      { k: 'VG / PG', v: '50 / 50' },
      { k: 'SIZE', v: '10 ml' },
      { k: 'BOTTLED', v: 'EU, in-house' },
    ],
    variants: [
      { id: 'blackcurrant-mint', label: 'Blackcurrant Mint', color: '#6B3FA0' },
      { id: 'vanilla-bourbon', label: 'Vanilla Bourbon', color: '#B07C3A' },
      { id: 'citrus-ice', label: 'Citrus Ice', color: '#3FA0A5' },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { products: PLUME_PRODUCTS, PLUME_PRODUCTS: PLUME_PRODUCTS };
} else {
  globalThis.PLUME_PRODUCTS = PLUME_PRODUCTS;
}
