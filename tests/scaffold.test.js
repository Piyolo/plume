'use strict';
/* Scaffold smoke test — verifies Task 1's deliverables stay true as later
   tasks edit index.html and style.css. Complements the in-browser checks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('all six source files exist', () => {
  for (const f of ['index.html', 'css/style.css', 'js/data.js',
                   'js/cart-store.js', 'js/cart.js', 'js/main.js']) {
    assert.ok(exists(f), `missing ${f}`);
  }
});

test('the three libraries are vendored locally at the pinned versions', () => {
  const gsap = read('assets/vendor/gsap.min.js');
  const st = read('assets/vendor/ScrollTrigger.min.js');
  const lenis = read('assets/vendor/lenis.min.js');

  assert.match(gsap, /3\.12\.5/, 'gsap is not 3.12.5');
  assert.match(st, /3\.12\.5/, 'ScrollTrigger is not 3.12.5');
  assert.match(lenis, /1\.1\.13/, 'lenis is not 1.1.13');

  for (const [name, src] of [['gsap', gsap], ['ScrollTrigger', st], ['lenis', lenis]]) {
    assert.ok(src.length > 10 * 1024, `${name} is suspiciously small (${src.length} bytes)`);
  }
});

test('fonts.css declares the three families and every referenced woff2 exists', () => {
  const css = read('assets/fonts/fonts.css');
  const faces = css.match(/@font-face/g) || [];
  assert.ok(faces.length >= 6, `expected >= 6 @font-face, got ${faces.length}`);

  for (const fam of ['Instrument Serif', 'Space Grotesk', 'JetBrains Mono']) {
    assert.ok(css.includes(`'${fam}'`), `font-family ${fam} not declared`);
  }

  const urls = [...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 6, `expected >= 6 woff2 references, got ${urls.length}`);
  for (const u of urls) {
    assert.ok(exists(path.join('assets/fonts', u)), `missing font file ${u}`);
  }
});

test('index.html loads no CDN assets and loads scripts in dependency order', () => {
  const html = read('index.html');

  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => /^(https?:)?\/\//.test(u) && !u.startsWith('data:'));
  assert.deepEqual(refs, [], `external references found: ${refs.join(', ')}`);

  assert.equal((html.match(/<script[^>]*type="module"/g) || []).length, 0,
    'ES modules would break file:// usage');

  const order = ['assets/vendor/gsap.min.js', 'assets/vendor/ScrollTrigger.min.js',
    'assets/vendor/lenis.min.js', 'js/data.js', 'js/cart-store.js',
    'js/cart.js', 'js/main.js'];
  let last = -1;
  for (const s of order) {
    const i = html.indexOf(`src="${s}"`);
    assert.ok(i > -1, `script not found: ${s}`);
    assert.ok(i > last, `script out of order: ${s}`);
    last = i;
  }
});

test('the document contains no canvas element (no 3D, ever)', () => {
  const html = read('index.html');
  assert.equal(/<canvas/i.test(html), false, 'canvas found — spec forbids 3D');
});

test('design tokens match the spec palette exactly', () => {
  const css = read('css/style.css');
  for (const [token, value] of Object.entries({
    '--bg': '#0A0A0B', '--surface': '#131315', '--text': '#F3F0EA',
    '--muted': '#8B887F', '--line': 'rgba(243, 240, 234, .14)',
    '--accent': '#E8B84B',
  })) {
    assert.ok(css.includes(`${token}: ${value}`),
      `${token} is not ${value}`);
  }
});
