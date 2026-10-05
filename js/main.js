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

/* ---------------------------------------------------------------- boot --- */

document.addEventListener('DOMContentLoaded', function () {
  initAgeGate();
});
