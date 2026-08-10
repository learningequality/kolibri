/**
 * Keyboard operation for interactions whose answer slots are filled from a set
 * of candidate responses.
 *
 * Tab reaches the slots and skips the response pool entirely; each slot behaves
 * like a compact select being stepped through rather than a menu that opens. A
 * slot is a `role="listbox"` owning visually hidden options, with
 * `aria-activedescendant` naming the current one, so a screen reader announces
 * the value without focus ever leaving the slot.
 *
 * A slot is addressed by however many parts the interaction needs — associate
 * uses (row, side), match uses (row, entry) — and those parts are passed
 * straight back to the callbacks.
 * @module useSlotListbox
 */
import { h, ref, unref } from 'vue';

const ARROW_OFFSETS = { ArrowDown: 1, ArrowUp: -1 };

let listboxCounter = 0;

export default function useSlotListbox({
  candidatesFor,
  currentValue,
  commit,
  clear,
  labelFor,
  disabled,
  onKeyboardFocus,
}) {
  listboxCounter += 1;
  const idPrefix = `qti-slot-listbox-${listboxCounter}`;

  const focusedKey = ref(null);

  // Only a focus the learner tabbed to fills the slot. A pointer press also
  // focuses it, and filling then would answer a slot the learner only meant to
  // choose as a click target. A press always precedes the focus it causes,
  // which is what distinguishes the two.
  let focusFromPointer = false;

  const isDisabled = () => Boolean(unref(disabled));
  const keyOf = address => address.join('-');
  const optionId = (address, index) => `${idPrefix}-${keyOf(address)}-${index}`;

  function activeIndex(address) {
    const current = currentValue(...address);
    if (!current) {
      return 0;
    }
    return Math.max(0, candidatesFor(...address).indexOf(current));
  }

  function notePointerDown() {
    focusFromPointer = true;
  }

  function handleFocus(address) {
    if (isDisabled()) {
      return;
    }
    focusedKey.value = keyOf(address);
    const fromPointer = focusFromPointer;
    focusFromPointer = false;
    if (fromPointer) {
      return;
    }
    if (onKeyboardFocus) {
      onKeyboardFocus(...address);
    }
    const candidates = candidatesFor(...address);
    if (candidates.length && !currentValue(...address)) {
      commit(candidates[0], ...address);
    }
  }

  function handleBlur(address) {
    if (focusedKey.value === keyOf(address)) {
      focusedKey.value = null;
    }
  }

  function handleKeydown(event, address) {
    if (isDisabled()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      clear(...address);
      return;
    }
    const candidates = candidatesFor(...address);
    if (!candidates.length) {
      return;
    }
    let next;
    if (event.key in ARROW_OFFSETS) {
      next = activeIndex(address) + ARROW_OFFSETS[event.key];
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = candidates.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    commit(candidates[Math.min(Math.max(next, 0), candidates.length - 1)], ...address);
  }

  return {
    /** A press that never became a focus must not suppress the next tab */
    forgetPointer() {
      focusFromPointer = false;
    },

    /**
     * Attributes making the slot element the listbox. Empty while disabled.
     * @param {...(number|string)} address - The slot's address parts
     * @returns {object} Attributes to spread onto the slot element
     */
    slotAttrs(...address) {
      if (isDisabled()) {
        return {};
      }
      return {
        role: 'listbox',
        tabindex: '0',
        'data-focus': 'true',
        'aria-activedescendant':
          focusedKey.value === keyOf(address) ? optionId(address, activeIndex(address)) : null,
      };
    },

    /**
     * Native listeners for the slot element.
     * @param {...(number|string)} address - The slot's address parts
     * @returns {object} Listeners to bind natively on the slot element
     */
    handlers(...address) {
      return {
        mousedown: notePointerDown,
        touchstart: notePointerDown,
        keydown: event => handleKeydown(event, address),
        focus: () => handleFocus(address),
        blur: () => handleBlur(address),
      };
    },

    /**
     * The options the slot owns. Visually hidden, so a screen reader steps
     * through the responses a sighted learner sees in the pool while the slot
     * shows only the current one.
     * @param {...(number|string)} address - The slot's address parts
     * @returns {object} The vnode for the slot's option list
     */
    renderOptions(...address) {
      const current = currentValue(...address);
      return h(
        'ul',
        { class: 'qti-visually-hidden', attrs: { role: 'presentation' } },
        candidatesFor(...address).map((identifier, index) =>
          h(
            'li',
            {
              key: identifier,
              attrs: {
                id: optionId(address, index),
                role: 'option',
                'aria-selected': String(identifier === current),
              },
            },
            labelFor(identifier),
          ),
        ),
      );
    },
  };
}
