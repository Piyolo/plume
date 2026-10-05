'use strict';
/* ==========================================================================
   PLUME — boot
   Order matters: the age gate runs first and owns the scroll lock; the
   scroll engine (Task 7) and cart (Task 9) register behind it.
   ========================================================================== */

var PLUME_AGE_KEY = 'plume.age';

function plumeAgeVerified() {
  try {
    return window.localStorage.getItem(PLUME_AGE_KEY) === '1';
  } catch (err) {
    return false;
  }
}

function plumeRememberAge() {
  try {
    window.localStorage.setItem(PLUME_AGE_KEY, '1');
  } catch (err) {
    // Storage blocked: the gate simply asks again next visit.
  }
}

function initAgeGate() {
  var gate = document.getElementById('ageGate');
  if (!gate) return;

  if (plumeAgeVerified()) {
    gate.parentNode.removeChild(gate);
    return;
  }

  var ask = document.getElementById('gateAsk');
  var refuse = document.getElementById('gateRefuse');
  var yes = document.getElementById('gateYes');
  var no = document.getElementById('gateNo');
  var back = document.getElementById('gateBack');

  document.body.classList.add('is-gated');

  function show(panel) {
    ask.hidden = panel !== ask;
    refuse.hidden = panel !== refuse;
    var focusable = panel.querySelector('button');
    if (focusable) focusable.focus();
  }

  yes.addEventListener('click', function () {
    plumeRememberAge();
    gate.classList.add('is-leaving');
    var delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600;
    window.setTimeout(function () {
      document.body.classList.remove('is-gated');
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      // Any scroll engine started behind the gate needs to know it moved.
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }, delay);
  });

  no.addEventListener('click', function () { show(refuse); });
  back.addEventListener('click', function () { show(ask); });
}

/* ------------------------------------------------- image fallback --- */
/* Spec §5: a failed image becomes a texture plate with typographic
   treatment — never a broken-image icon. The `error` event does not bubble,
   so it is caught in the capture phase to also cover images added later. */

function markPlate(img) {
  var host = img.parentNode;
  if (!host || host.nodeType !== 1) return;
  host.classList.add('is-plate');
  if (!host.getAttribute('data-plate-label')) {
    var alt = img.getAttribute('alt');
    if (alt) host.setAttribute('data-plate-label', alt);
  }
}

function initImageFallback() {
  function onError(event) {
    var target = event.target;
    if (!target || target.tagName !== 'IMG') return;
    if (String(target.getAttribute('src') || '').indexOf('assets/img/') !== 0) return;
    markPlate(target);
  }
  document.addEventListener('error', onError, true);

  var existing = document.querySelectorAll('img[src^="assets/img/"]');
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].complete && existing[i].naturalWidth === 0) markPlate(existing[i]);
  }
}

/* ------------------------------------------------- reduced motion --- */
/* Spec §4: prefers-reduced-motion releases every pin, kills all parallax
   and leaves the page in normal flow with all content visible. */

function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------- HUD label --- */

function setHud(section) {
  var name = section.getAttribute('data-name');
  var marker = section.querySelector('[data-marker]');
  if (name) document.getElementById('sectionName').textContent = name;
  if (marker) document.getElementById('chapterMarker').textContent = marker.textContent;
}

function hudFromScroll() {
  var mid = window.innerHeight / 2;
  var sections = document.querySelectorAll('main section[data-name]');
  for (var i = 0; i < sections.length; i++) {
    var box = sections[i].getBoundingClientRect();
    if (box.top <= mid && box.bottom > mid) {
      setHud(sections[i]);
      return;
    }
  }
}

/* -------------------------------------------------------- scroll ---- */
/* One entry point: starts Lenis, binds it to ScrollTrigger, then registers
   reveals, parallax and HUD sync. Returns early — no Lenis, no
   ScrollTrigger — when the visitor prefers reduced motion. */

function initScroll() {
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

  window.gsap.registerPlugin(window.ScrollTrigger);
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;

  /* --- Step 1: reduced-motion branch, checked first --- */
  if (prefersReduced()) {
    var revealEls = document.querySelectorAll('.reveal');
    for (var i = 0; i < revealEls.length; i++) {
      revealEls[i].style.opacity = '1';
      revealEls[i].style.transform = 'none';
    }
    /* No motion, but the HUD label is content, not animation — keep it true. */
    hudFromScroll();
    window.addEventListener('scroll', hudFromScroll, { passive: true });
    return;
  }

  /* --- Step 2: Lenis bound to the ScrollTrigger ticker --- */
  var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.refresh();

  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
    lenis.resize();
  });

  /* Anchor links must route through Lenis. A stale href (no target) would
     otherwise leave the visitor on a dead link, so it falls back to the top. */
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    event.preventDefault();
    var target = null;
    try { target = document.querySelector(href); } catch (err) { target = null; }
    lenis.scrollTo(target || 0, { offset: -64 });
  });

  /* --- Step 3: hero stagger, reveals, parallax, HUD sync --- */
  gsap.from('.hero__eyebrow, .hero__word, .hero__tag, .hero__sub', {
    y: 32,
    opacity: 0,
    duration: 1.1,
    ease: 'power2.out',
    stagger: 0.08,
    delay: 0.12,
  });

  gsap.utils.toArray('.reveal').forEach(function (el) {
    gsap.to(el, {
      y: 0,
      opacity: 1,
      duration: 1.1,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  gsap.utils.toArray('[data-parallax]').forEach(function (el) {
    var section = el.closest('section') || document.body;
    gsap.fromTo(el, { yPercent: -12 }, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  gsap.utils.toArray('main section[data-name]').forEach(function (section) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onEnter: function () { setHud(section); },
      onEnterBack: function () { setHud(section); },
    });
  });

  initChapterOne();
  initChapterArc();
  initChapterReserve();

  /* The pinned chapters add roughly 4,600px of pin-spacer height AFTER Lenis
     measured the document, so Lenis would clamp scrolling to its stale limit
     and the bottom third of the page would be unreachable. Re-measure. */
  ScrollTrigger.refresh();
  lenis.resize();
}

/* ------------------------------------------------------ chapters ---- */
/* Spec §3: "device held stationary while spec callouts and imagery scrub
   past". Every chapter is taller than its viewport (measured: 930–1265px on
   a 900px desktop, 1567–1943px on an 844px phone), so the SECTION cannot be
   pinned as-is — its tail would be unreachable. Instead JS gives the chapter
   a fixed 100vh frame and scrubs the copy column through it: the device
   holds still, the callouts travel. Below 768px no frame is applied at all
   and the chapter is ordinary flow. */

function chapterOverflow(section, copy) {
  var cs = window.getComputedStyle(section);
  var avail = section.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  return Math.max(0, Math.round(copy.offsetHeight - avail));
}

function chapterFrame(section, extra) {
  section.classList.add('is-pinned');
  var copy = section.querySelector('.chapter__copy');
  var over = chapterOverflow(section, copy);
  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=' + extra,
      pin: true,
      pinSpacing: true,
      scrub: true,
    },
  });
  tl.to(copy, { y: -over, duration: 1 }, 0);
  return tl;
}

function chapterRelease(section, targets) {
  section.classList.remove('is-pinned');
  gsap.set(targets, { clearProps: 'all' });
}

function initChapterOne() {
  if (prefersReduced()) return;
  var section = document.getElementById('chapter-one');
  if (!section) return;

  gsap.matchMedia().add('(min-width: 768px)', function () {
    var copy = section.querySelector('.chapter__copy');
    var hero = section.querySelector('.chapter__hero');
    var rows = gsap.utils.toArray(section.querySelectorAll('.specs__row'));
    var price = section.querySelector('.chapter__price');

    var tl = chapterFrame(section, 1600);
    tl.to(hero, { scale: 1.08, duration: 1 }, 0);
    gsap.set(rows, { opacity: 0, y: 24 });
    gsap.set(price, { opacity: 0, y: 20 });
    [0.15, 0.35, 0.55, 0.75].forEach(function (at, i) {
      if (rows[i]) tl.to(rows[i], { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, at);
    });
    tl.to(price, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.88);
    tl.to({}, { duration: 0.0001 }, 1);

    ScrollTrigger.refresh();
    return function () { chapterRelease(section, rows.concat([price, copy, hero])); };
  });
}

function initChapterArc() {
  if (prefersReduced()) return;
  var section = document.getElementById('chapter-arc');
  if (!section) return;
  var track = section.querySelector('.arc-track__inner');
  var captions = gsap.utils.toArray(section.querySelectorAll('.arc-panel span'));

  gsap.matchMedia().add('(min-width: 768px)', function () {
    var copy = section.querySelector('.chapter__copy');
    if (captions.length > 1) gsap.set(captions.slice(1), { opacity: 0 });

    var tl = chapterFrame(section, 1400);
    tl.to(track, { xPercent: -66.6667, duration: 1 }, 0);
    /* each caption cross-fades as its own panel's centre reaches centre */
    if (captions[0]) tl.to(captions[0], { opacity: 0, duration: 0.12 }, 0.30);
    if (captions[1]) {
      tl.to(captions[1], { opacity: 1, duration: 0.12 }, 0.28);
      tl.to(captions[1], { opacity: 0, duration: 0.12 }, 0.60);
    }
    if (captions[2]) tl.to(captions[2], { opacity: 1, duration: 0.12 }, 0.58);
    tl.to({}, { duration: 0.0001 }, 1);

    ScrollTrigger.refresh();
    return function () { chapterRelease(section, [copy, track].concat(captions)); };
  });

  /* Below 768px the chapter is not pinned, but the colourway track still
     slides on natural scroll. Below 480px CSS hides it entirely — no
     ScrollTrigger is created for a display:none box. */
  gsap.matchMedia().add('(max-width: 767px)', function () {
    if (!track || track.offsetParent === null) return;
    var tween = gsap.to(track, {
      xPercent: -66.6667,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top center', end: 'bottom bottom', scrub: true },
    });
    return function () {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
      gsap.set(track, { clearProps: 'all' });
    };
  });
}

function initChapterReserve() {
  if (prefersReduced()) return;
  var section = document.getElementById('chapter-reserve');
  if (!section) return;
  var cards = gsap.utils.toArray(section.querySelectorAll('.flavour'));
  var notes = gsap.utils.toArray(section.querySelectorAll('.tasting__note'));

  gsap.matchMedia().add('(min-width: 768px)', function () {
    var copy = section.querySelector('.chapter__copy');
    gsap.set(cards, { opacity: 0, y: 80 });
    if (notes.length > 1) gsap.set(notes.slice(1), { opacity: 0 });

    var tl = chapterFrame(section, 1400);
    cards.forEach(function (card, i) {
      tl.to(card, { y: -40 * i, opacity: 1, duration: 0.18, ease: 'power2.out' }, 0.15 + i * 0.2);
    });
    if (notes.length === 3) {
      tl.to(notes[0], { opacity: 0, duration: 0.1 }, 0.32);
      tl.to(notes[1], { opacity: 1, duration: 0.1 }, 0.32);
      tl.to(notes[1], { opacity: 0, duration: 0.1 }, 0.55);
      tl.to(notes[2], { opacity: 1, duration: 0.1 }, 0.55);
    }
    tl.to({}, { duration: 0.0001 }, 1);

    ScrollTrigger.refresh();
    return function () { chapterRelease(section, cards.concat([copy]).concat(notes)); };
  });
}

/* ---------------------------------------------------------------- boot --- */

document.addEventListener('DOMContentLoaded', function () {
  initAgeGate();
  initImageFallback();
  initScroll();
  initCart();
});
