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

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

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
}

/* ---------------------------------------------------------------- boot --- */

document.addEventListener('DOMContentLoaded', function () {
  initAgeGate();
  initImageFallback();
  initScroll();
});
