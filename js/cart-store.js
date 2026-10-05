'use strict';
/* ==========================================================================
   PLUME — cart store
   Pure cart state, DOM-free, storage injected so it can be tested (and can
   fail) without a browser. Spec: docs/superpowers/specs/...-design.md §6.

   Cart line shape is pinned by spec §6: { id, name, variant, unitPrice, qty }
   where id === productId + '::' + variantId.
   ========================================================================== */

var PLUME_CART_KEY = 'plume.cart';
/* Nobody orders 4,000 of one device; this only exists so a merged or corrupt
   qty cannot produce an absurd badge or an overflowing subtotal. */
var MAX_LINE_QTY = 99;

/* A cart line must be internally sane, not merely well-typed. Stored data is
   untrusted: anything that reached localStorage could be hand-edited or left
   behind by an older build. Rejecting negative/fractional quantities and
   non-integer prices here is what stops a corrupt store producing a negative
   badge or fractional cents. */
function isUsableLine(line) {
  return !!line &&
    typeof line.id === 'string' &&
    typeof line.name === 'string' &&
    typeof line.variant === 'string' &&
    Number.isInteger(line.unitPrice) && line.unitPrice >= 0 &&
    Number.isInteger(line.qty) && line.qty > 0;
}

function cloneLine(line) {
  return {
    id: line.id,
    name: line.name,
    variant: line.variant,
    unitPrice: line.unitPrice,
    qty: line.qty,
  };
}

/**
 * @param {Storage|null} storage anything with getItem/setItem (usually localStorage),
 *                                or null for a purely in-memory cart.
 */
function createCartStore(storage) {
  var lines = [];
  var persistable = !!storage;

  function load() {
    if (!storage) return;
    try {
      var raw = storage.getItem(PLUME_CART_KEY);
      if (raw === null || raw === undefined || raw === '') return;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('cart is not an array');
      var seen = {};
      var kept = [];
      for (var i = 0; i < parsed.length; i++) {
        var line = parsed[i];
        if (!isUsableLine(line)) continue;
        /* Duplicate ids would render as duplicate rows, and find() only ever
           returns the first — leaving the rest permanently unremovable.
           Merge them into one line instead. */
        if (seen[line.id]) {
          seen[line.id].qty = Math.min(MAX_LINE_QTY, seen[line.id].qty + line.qty);
          continue;
        }
        var copy = cloneLine(line);
        copy.qty = Math.min(MAX_LINE_QTY, copy.qty);
        seen[line.id] = copy;
        kept.push(copy);
      }
      lines = kept;
    } catch (err) {
      /* Malformed storage: start empty but KEEP persistence enabled, so the
         next mutation overwrites the bad value with good JSON. Disabling it
         here would leave the corrupt string in place and the cart would never
         persist again for the rest of the session. */
      lines = [];
    }
  }

  function persist() {
    if (!persistable || !storage) return;
    try {
      storage.setItem(PLUME_CART_KEY, JSON.stringify(lines));
    } catch (err) {
      // Quota, private mode, blocked cookies: keep working in memory only.
      persistable = false;
    }
  }

  var listeners = [];
  function emit() {
    var snapshot = items();
    for (var i = 0; i < listeners.length; i++) listeners[i](snapshot);
  }

  function items() {
    return lines.map(cloneLine);
  }

  function find(id) {
    for (var i = 0; i < lines.length; i++) if (lines[i].id === id) return lines[i];
    return null;
  }

  function add(product, variantId) {
    var variant = (variantId === undefined || variantId === null) ? 'default' : String(variantId);
    var id = product.id + '::' + variant;
    var existing = find(id);
    if (existing) {
      existing.qty += 1;
    } else {
      lines.push({
        id: id,
        name: product.name,
        variant: variant,
        unitPrice: product.priceCents,
        qty: 1,
      });
    }
    persist();
    emit();
    return find(id);
  }

  function setQty(id, qty) {
    var line = find(id);
    if (!line) return;
    if (qty <= 0) {
      lines = lines.filter(function (l) { return l.id !== id; });
    } else {
      line.qty = Math.min(MAX_LINE_QTY, Math.max(1, Math.round(qty)));
    }
    persist();
    emit();
  }

  function remove(id) {
    var before = lines.length;
    lines = lines.filter(function (l) { return l.id !== id; });
    if (lines.length === before) return;
    persist();
    emit();
  }

  function clear() {
    // Always notifies, even on an empty cart — the listener contract is
    // "one notification per mutating call", so the UI never misses a redraw.
    lines = [];
    persist();
    emit();
  }

  function count() {
    return lines.reduce(function (sum, l) { return sum + l.qty; }, 0);
  }

  function subtotal() {
    return lines.reduce(function (sum, l) { return sum + l.qty * l.unitPrice; }, 0);
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  load();

  return {
    items: items,
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    count: count,
    subtotal: subtotal,
    subscribe: subscribe,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCartStore: createCartStore, PLUME_CART_KEY: PLUME_CART_KEY };
} else {
  globalThis.createCartStore = createCartStore;
}
