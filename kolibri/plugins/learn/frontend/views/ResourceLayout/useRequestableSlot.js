import { inject, provide, ref, markRaw, onBeforeUnmount } from 'vue';

/**
 * Composable that encapsulates a "requestable slot" — a slot that nested
 * ResourceLayout components can claim (last write wins).
 *
 * Each requestable slot uses a single provide/inject key. The pattern:
 * - Root component: stores child overrides in an ordered map (last entry wins)
 * - Nested component: forwards the override up to its parent via inject
 * - Each caller is tracked by a unique identity so sibling unmounts
 *   only remove their own registration
 *
 * @param {string} injectionKey - The provide/inject key for this slot
 * @param {Object} slots       - The component's slots object (from setup context)
 * @param {string} slotKey     - The name of the slot to manage (e.g. 'sidePanel')
 * @returns {Object}
 *   parentRequest    - The injected parent request fn (null if this is root)
 *   contentRef       - Ref holding the child override render function
 *   syncRegistration - Call in render to sync own slot with parent (nested only)
 *   getContent       - Returns resolved content: child override or own slot
 *   hasContent       - Boolean check for any content source
 */
export default function useRequestableSlot(injectionKey, slots, slotKey) {
  const parentRequest = inject(injectionKey, null);
  const contentRef = ref(null);

  // Unique identity for this instance, used to track registrations
  const callerId = Symbol();

  // Ordered map of child registrations — last entry wins.
  // Only used by the root-level instance (the one without a parentRequest).
  const registrations = new Map();

  // Plain object, intentionally not reactive — synchronous flag for render
  const reg = { registered: false };

  // Stable wrapper pattern: currentSlotFn holds the latest slot function.
  // stableWrapper is created once and always delegates to currentSlotFn.
  // This avoids pushing a new closure to parentRequest on every render,
  // which would trigger reactive updates and cause infinite re-renders
  // (especially with implicit default slots in Vue 2).
  let currentSlotFn = null;
  const stableWrapper = () => currentSlotFn();

  // Resolve contentRef from registrations map (last entry wins)
  function resolveContent() {
    const entries = Array.from(registrations.values());
    contentRef.value = entries.length ? markRaw(entries[entries.length - 1]) : null;
  }

  const requestFn = (renderFn, id) => {
    if (parentRequest) {
      parentRequest(renderFn, id);
    } else if (renderFn) {
      registrations.set(id, renderFn);
      resolveContent();
    } else {
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
  };
}
