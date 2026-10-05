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

/* ---------------------------------------------------------------- boot --- */

document.addEventListener('DOMContentLoaded', function () {
  initAgeGate();
  initImageFallback();
});
