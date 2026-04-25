import { inject, provide, ref, markRaw, onBeforeUnmount } from 'vue';

// Sentinel value used to signal "activate this caller" through the requestFn chain,
// distinct from any render function or null (unregister).
const ACTIVATE = Symbol('activate');

/**
 * Composable that encapsulates a "requestable slot" — a slot that nested
 * ResourceLayout components can claim (deepest wins, focus overrides).
 *
 * Each requestable slot uses a single provide/inject key. The pattern:
 * - Root component: stores child overrides in a map with depth metadata
 * - Nested component: forwards the override up to its parent via inject,
 * incrementing depth at each level
 * - Resolution: focused registration wins; otherwise deepest wins;
 * ties broken by insertion order (last wins)
 * - Each caller is tracked by a unique identity so sibling unmounts
 * only remove their own registration.
 * @param {string} injectionKey - The provide/inject key for this slot.
 * @param {object} slots - The component's slots object (from setup context).
 * @param {string} slotKey - The name of the slot to manage (e.g. 'sidePanel').
 * @returns {object}
 * parentRequest    - The injected parent request fn (null if this is root)
 * contentRef       - Ref holding the resolved child override render function
 * syncRegistration - Call in render to sync own slot with parent (nested only)
 * getContent       - Returns resolved content: child override or own slot
 * hasContent       - Boolean check for any content source
 * activate         - Signal that this component's subtree gained focus
 * isRegistered     - Whether this instance currently has a registration with parent
 */
export default function useRequestableSlot(injectionKey, slots, slotKey) {
  const parentRequest = inject(injectionKey, null);
  const contentRef = ref(null);

  // Unique identity for this instance, used to track registrations
  const callerId = Symbol();

  // Ordered map of child registrations: id → { fn, depth }
  // Only used by the root-level instance (the one without a parentRequest).
  const registrations = new Map();

  // The currently focused/activated caller id (root only)
  let activeId = null;

  // Plain object, intentionally not reactive — synchronous flag for render
  const reg = { registered: false };

  // Stable wrapper pattern: currentSlotFn holds the latest slot function.
  // stableWrapper is created once and always delegates to currentSlotFn.
  // This avoids pushing a new closure to parentRequest on every render,
  // which would trigger reactive updates and cause infinite re-renders
  // (especially with implicit default slots in Vue 2).
  let currentSlotFn = null;
  const stableWrapper = () => currentSlotFn();

  // Resolve contentRef from registrations (focused wins, then deepest, then last)
  function resolveContent() {
    if (registrations.size === 0) {
      contentRef.value = null;
      return;
    }

    // If there's an active (focused) registration, prefer it
    if (activeId !== null && registrations.has(activeId)) {
      contentRef.value = markRaw(registrations.get(activeId).fn);
      return;
    }

    // Otherwise pick the deepest; among equal depth, last entry wins (Map order)
    let best = null;
    for (const entry of registrations.values()) {
      if (best === null || entry.depth >= best.depth) {
        best = entry;
      }
    }
    contentRef.value = best ? markRaw(best.fn) : null;
  }

  const requestFn = (renderFn, id, depth = 1) => {
    if (parentRequest) {
      // Forward up the chain, incrementing depth
      parentRequest(renderFn, id, depth + 1);
    } else if (renderFn === ACTIVATE) {
      // Activation signal — mark this caller as focused
      activeId = id;
      resolveContent();
    } else if (renderFn) {
      // Register
      registrations.set(id, { fn: renderFn, depth });
      resolveContent();
    } else {
      // Unregister
      if (activeId === id) {
        activeId = null;
      }
      registrations.delete(id);
      resolveContent();
    }
  };

  provide(injectionKey, requestFn);

  onBeforeUnmount(() => {
    if (reg.registered && parentRequest) {
      parentRequest(null, callerId);
    }
  });

  function syncRegistration() {
    const slot = slots[slotKey];
    if (slot && parentRequest) {
      currentSlotFn = () => slot();
      if (!reg.registered) {
        // First registration: send the stable wrapper to parent
        parentRequest(stableWrapper, callerId);
        reg.registered = true;
      }
      // Subsequent calls: currentSlotFn is updated but stableWrapper
      // reference stays the same — no reactive trigger in parent
    } else if (reg.registered && parentRequest) {
      currentSlotFn = null;
      parentRequest(null, callerId);
      reg.registered = false;
    }
  }

  function activate() {
    if (reg.registered && parentRequest) {
      parentRequest(ACTIVATE, callerId);
    }
  }

  function isRegistered() {
    return reg.registered;
  }

  function getContent() {
    if (contentRef.value) return contentRef.value();
    const slot = slots[slotKey];
    if (slot) return slot();
    return null;
  }

  function hasContent() {
    return Boolean(contentRef.value || slots[slotKey]);
  }

  return {
    parentRequest,
    contentRef,
    syncRegistration,
    getContent,
    hasContent,
    activate,
    isRegistered,
  };
}
