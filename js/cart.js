'use strict';
/* ==========================================================================
   PLUME — cart UI, checkout and money formatting
   Spec: docs/superpowers/specs/...-design.md §6

   Pure helpers (formatMoney, generateOrderNumber) live at the top and are
   exported for Node so they can be tested without a browser. initCart() is
   the DOM layer and is only meaningful in a page.
   ========================================================================== */

/* ------------------------------------------------------------ money --- */

/**
 * Cents to a display string. Whole dollars drop the decimals entirely
 * ("$64", not "$64.00"); anything with cents keeps two places ("$18.50").
 * @param {number} cents integer cents
 * @returns {string}
 */
function formatMoney(cents) {
  var value = Math.round(Number(cents) || 0);
  var sign = value < 0 ? '-' : '';
  var abs = Math.abs(value);
  var dollars = Math.floor(abs / 100);
  var rest = abs % 100;
  if (rest === 0) return sign + '$' + String(dollars);
  return sign + '$' + String(dollars) + '.' + (rest < 10 ? '0' + rest : String(rest));
}

/* ---------------------------------------------------- order numbers --- */

var ORDER_WIDTH = 4;
var ORDER_MODULUS = 0x10000; /* 65536 — exactly four base-36 characters */
/* 7919 is odd, therefore coprime with 65536, so consecutive sequence values
   can never collide once folded in. */
var ORDER_STRIDE = 7919;
var orderSequence = 0;

function base36(value, width) {
  var text = (value >>> 0).toString(36).toUpperCase();
  while (text.length < width) text = '0' + text;
  return text.slice(-width);
}

/**
 * A demo order number: PLM-XXXX-YYYY. The four-character body mixes
 * randomness with a monotonic counter, so two calls in the same millisecond
 * still differ even if Math.random is pinned.
 * @param {Date} [now] injectable for tests
 * @returns {string} matching /^PLM-[A-Z0-9]{4}-\d{4}$/
 */
function generateOrderNumber(now) {
  var when = now instanceof Date ? now : new Date();
  orderSequence = (orderSequence + 1) % ORDER_MODULUS;
  var entropy = Math.floor(Math.random() * ORDER_MODULUS);
  var mixed = (entropy + orderSequence * ORDER_STRIDE) % ORDER_MODULUS;
  return 'PLM-' + base36(mixed, ORDER_WIDTH) + '-' + String(when.getFullYear());
}

/* ============================================================ cart UI === */

var REQUIRED_FIELDS = ['name', 'email', 'address', 'city', 'postcode'];
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Validation failures must never throw at the visitor — private mode and
   blocked storage are normal, not exceptional. */
function safeStorage() {
  try {
    return window.localStorage;
  } catch (err) {
    return null;
  }
}

function productById(id) {
  var list = typeof PLUME_PRODUCTS !== 'undefined' ? PLUME_PRODUCTS : [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function variantLabel(line) {
  var product = productById(String(line.id).split('::')[0]);
  if (!product) return line.variant;
  for (var i = 0; i < product.variants.length; i++) {
    if (product.variants[i].id === line.variant) return product.variants[i].label;
  }
  return line.variant;
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function setLock(locked) {
  document.body.classList.toggle('is-locked', locked);
  if (window.__lenis) {
    if (locked) window.__lenis.stop();
    else window.__lenis.start();
  }
}

function initCart() {
  if (typeof document === 'undefined') return;

  var store = createCartStore(safeStorage());
  globalThis.__cartStore = store;

  var drawer = document.getElementById('cartDrawer');
  var scrim = document.getElementById('cartScrim');
  var cartBtn = document.getElementById('cartBtn');
  var badge = document.getElementById('cartCount');
  var linesHost = document.getElementById('cartLines');
  var emptyState = document.getElementById('cartEmpty');
  var subtotalEl = document.getElementById('cartSubtotal');
  var checkoutBtn = document.getElementById('checkoutBtn');
  var continueShopping = document.getElementById('continueShopping');
  var cartClose = document.getElementById('cartClose');
  var openCart = document.getElementById('openCart');

  var overlay = document.getElementById('checkout');
  var form = document.getElementById('orderForm');
  var summaryHost = document.getElementById('summaryLines');
  var summaryTotal = document.getElementById('summaryTotal');
  var formError = document.getElementById('formError');
  var checkoutClose = document.getElementById('checkoutClose');
  var confirmPanel = document.getElementById('confirmPanel');
  var orderNumberEl = document.getElementById('orderNumber');
  var continueAfter = document.getElementById('continueAfter');
  var checkoutGrid = document.getElementById('checkoutForm');

  if (!drawer || !linesHost || !form) return;

  /* ------------------------------------------------------- rendering --- */

  function renderLine(line) {
    var li = el('li', 'line');
    li.setAttribute('data-line', line.id);
    li.appendChild(el('p', 'line__name', line.name));
    li.appendChild(el('p', 'line__total', formatMoney(line.qty * line.unitPrice)));
    li.appendChild(el('p', 'line__variant', variantLabel(line)));

    var controls = el('div', 'line__controls');
    var dec = el('button', 'qty', '−');
    dec.type = 'button';
    dec.setAttribute('data-act', 'dec');
    dec.setAttribute('aria-label', 'Decrease quantity of ' + line.name);

    var qty = el('span', 'line__count', String(line.qty));

    var inc = el('button', 'qty', '+');
    inc.type = 'button';
    inc.setAttribute('data-act', 'inc');
    inc.setAttribute('aria-label', 'Increase quantity of ' + line.name);

    var remove = el('button', 'line__remove', 'Remove');
    remove.type = 'button';
    remove.setAttribute('data-act', 'remove');

    controls.appendChild(dec);
    controls.appendChild(qty);
    controls.appendChild(inc);
    controls.appendChild(remove);
    li.appendChild(controls);
    return li;
  }

  function renderSummaryLine(line) {
    var li = document.createElement('li');
    var what = el('span', null, line.qty + ' × ' + line.name +
      ' (' + variantLabel(line) + ')');
    li.appendChild(what);
    li.appendChild(el('b', null, formatMoney(line.qty * line.unitPrice)));
    return li;
  }

  /* Badge and drawer are written from one subscription, so they cannot
     drift apart — the badge is never set from a second code path. */
  function render() {
    var lines = store.items();

    linesHost.textContent = '';
    for (var i = 0; i < lines.length; i++) linesHost.appendChild(renderLine(lines[i]));

    var empty = lines.length === 0;
    emptyState.hidden = !empty;
    subtotalEl.textContent = formatMoney(store.subtotal());
    if (checkoutBtn) checkoutBtn.disabled = empty;

    var count = store.count();
    badge.textContent = String(count);
    badge.hidden = count === 0;

    if (summaryHost) {
      summaryHost.textContent = '';
      for (var j = 0; j < lines.length; j++) summaryHost.appendChild(renderSummaryLine(lines[j]));
    }
    if (summaryTotal) summaryTotal.textContent = formatMoney(store.subtotal());
  }

  store.subscribe(render);

  function bumpBadge() {
    badge.classList.remove('is-bump');
    /* force reflow so the animation restarts on a rapid second add */
    void badge.offsetWidth;
    badge.classList.add('is-bump');
  }

  /* ----------------------------------------------------- open / close --- */

  function openDrawer() {
    if (!overlay || overlay.hidden) {
      drawer.hidden = false;
      if (scrim) scrim.hidden = false;
      setLock(true);
      if (cartClose) cartClose.focus();
    }
  }

  function closeDrawer() {
    drawer.hidden = true;
    if (scrim) scrim.hidden = true;
    if (overlay && !overlay.hidden) return;
    setLock(false);
  }

  function closeCheckout() {
    if (!overlay) return;
    overlay.hidden = true;
    if (confirmPanel) confirmPanel.hidden = true;
    if (checkoutGrid) checkoutGrid.hidden = false;
    setLock(false);
    if (cartBtn) cartBtn.focus();
  }

  if (cartBtn) cartBtn.addEventListener('click', openDrawer);
  if (openCart) openCart.addEventListener('click', openDrawer);
  if (cartClose) cartClose.addEventListener('click', closeDrawer);
  if (continueShopping) {
    continueShopping.addEventListener('click', function () {
      closeDrawer();
      var range = document.getElementById('range');
      if (range && window.__lenis) window.__lenis.scrollTo(range, { offset: -64 });
    });
  }
  if (scrim) scrim.addEventListener('click', closeDrawer);
  if (checkoutClose) checkoutClose.addEventListener('click', closeCheckout);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (overlay && !overlay.hidden) closeCheckout();
    else if (!drawer.hidden) closeDrawer();
  });

  /* ------------------------------------------------------- add / qty --- */

  document.addEventListener('click', function (event) {
    var addBtn = event.target && event.target.closest
      ? event.target.closest('button[data-product]')
      : null;
    if (addBtn) {
      var product = productById(addBtn.getAttribute('data-product'));
      if (!product) return;
      store.add(product, addBtn.getAttribute('data-variant'));
      bumpBadge();
      openDrawer();
      return;
    }

    var qtyBtn = event.target && event.target.closest
      ? event.target.closest('.line__controls [data-act]')
      : null;
    if (!qtyBtn) return;
    var row = qtyBtn.closest('.line');
    if (!row) return;
    var id = row.getAttribute('data-line');
    var current = null;
    var all = store.items();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) current = all[i];
    }
    if (!current) return;
    var act = qtyBtn.getAttribute('data-act');
    if (act === 'inc') store.setQty(id, current.qty + 1);
    else if (act === 'dec') store.setQty(id, current.qty - 1);
    else if (act === 'remove') store.remove(id);
  });

  /* ---------------------------------------------------- variant chips --- */

  document.addEventListener('click', function (event) {
    var chip = event.target && event.target.closest ? event.target.closest('.swatch') : null;
    if (!chip) return;
    var group = chip.closest('.swatches');
    if (!group) return;
    var chips = group.querySelectorAll('.swatch');
    for (var i = 0; i < chips.length; i++) chips[i].classList.remove('is-active');
    chip.classList.add('is-active');

    var host = group.parentElement;
    var target = host && host.querySelector('button.add[data-product]');
    if (target) target.setAttribute('data-variant', chip.getAttribute('data-variant'));
  });

  /* --------------------------------------------------------- checkout --- */

  function fieldError(input) {
    var label = input.closest('.field');
    var msg = label ? label.querySelector('.field__msg') : null;
    return msg;
  }

  function clearErrors() {
    var labels = form.querySelectorAll('.field');
    for (var i = 0; i < labels.length; i++) {
      labels[i].classList.remove('is-invalid');
      labels[i].removeAttribute('aria-invalid');
      var msg = labels[i].querySelector('.field__msg');
      if (msg) msg.remove();
    }
    formError.hidden = true;
    formError.textContent = '';
  }

  function markInvalid(input, message) {
    var label = input.closest('.field');
    if (!label) return;
    label.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    var msg = fieldError(input);
    if (!msg) {
      msg = el('span', 'field__msg', message);
      label.appendChild(msg);
    } else {
      msg.textContent = message;
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();

    var firstBad = null;
    for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
      var name = REQUIRED_FIELDS[i];
      var input = form.elements[name];
      if (!input) continue;
      var value = String(input.value || '').trim();
      if (!value) {
        markInvalid(input, 'This field is required.');
        if (!firstBad) firstBad = input;
        continue;
      }
      if (name === 'email' && !EMAIL_PATTERN.test(value)) {
        markInvalid(input, 'Enter a valid email address.');
        if (!firstBad) firstBad = input;
      }
    }

    if (firstBad) {
      /* The cart is deliberately untouched — a failed submit must not cost
         the visitor anything they had already put in it. */
      formError.textContent = 'Check the highlighted fields.';
      formError.hidden = false;
      firstBad.focus();
      return;
    }

    if (store.count() === 0) {
      formError.textContent = 'Your cart is empty.';
      formError.hidden = false;
      return;
    }

    orderNumberEl.textContent = generateOrderNumber();
    store.clear();
    checkoutGrid.hidden = true;
    confirmPanel.hidden = false;
    var again = continueAfter;
    if (again) again.focus();
  });

  if (continueAfter) {
    continueAfter.addEventListener('click', function () {
      form.reset();
      closeCheckout();
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      if (store.count() === 0) return;
      drawer.hidden = true;
      if (scrim) scrim.hidden = true;
      if (confirmPanel) confirmPanel.hidden = true;
      if (checkoutGrid) checkoutGrid.hidden = false;
      overlay.hidden = false;
      setLock(true);
      var nameInput = form.elements.name;
      if (nameInput) nameInput.focus();
    });
  }

  render();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatMoney: formatMoney,
    generateOrderNumber: generateOrderNumber,
    initCart: initCart,
  };
} else {
  globalThis.formatMoney = formatMoney;
  globalThis.generateOrderNumber = generateOrderNumber;
  globalThis.initCart = initCart;
}
