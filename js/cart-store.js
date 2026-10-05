'use strict';
/* ==========================================================================
   PLUME — cart store
   Pure cart state, DOM-free, storage injected so it can be tested (and can
   fail) without a browser. Spec: docs/superpowers/specs/...-design.md §6.

   Cart line shape is pinned by spec §6: { id, name, variant, unitPrice, qty }
   where id === productId + '::' + variantId.
   ========================================================================== */

var PLUME_CART_KEY = 'plume.cart';

function isUsableLine(line) {
  return !!line &&
    typeof line.id === 'string' &&
    typeof line.name === 'string' &&
    typeof line.variant === 'string' &&
    Number.isFinite(line.unitPrice) &&
    Number.isFinite(line.qty);
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
      lines = Array.isArray(parsed) ? parsed.filter(isUsableLine).map(cloneLine) : [];
    } catch (err) {
      // Malformed or unreadable storage: fall back to memory for this session.
      lines = [];
      persistable = false;
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
      line.qty = qty;
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
