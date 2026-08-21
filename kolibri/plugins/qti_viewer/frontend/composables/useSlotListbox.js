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
 * The options lead with an empty one, so undoing an answer is a step like any
 * other rather than a shortcut a learner has to know about.
 *
 * A slot is addressed by however many parts the interaction needs — associate
 * uses (row, side), match uses (row, entry) — and those parts are passed
 * straight back to the callbacks.
 * @module useSlotListbox
 */
import { h, ref, unref } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';

export const slotListboxStrings = createTranslator('SlotListboxStrings', {
  emptyOption: {
    message: 'No response',
    context:
      'The option a learner steps to with the arrow keys to take their answer back out of a slot, leaving it empty',
  },
});

const { emptyOption$ } = slotListboxStrings;

const ARROW_OFFSETS = { ArrowDown: 1, ArrowUp: -1 };

const EMPTY = null;

let listboxCounter = 0;

export default function useSlotListbox({
  candidatesFor,
  currentValue,
  commit,
  clear,
  labelFor,
  disabled,
  onKeyboardFocus,
  autoFillOnFocus = () => true,
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

  function optionsFor(address) {
    return [EMPTY, ...candidatesFor(...address)];
  }

  function activeIndex(address) {
    const current = currentValue(...address) || EMPTY;
    return Math.max(0, optionsFor(address).indexOf(current));
  }

  // Stepping is one operation over the options, whichever of them is landed on
  function chooseAt(address, index) {
    const options = optionsFor(address);
    const chosen = options[Math.min(Math.max(index, 0), options.length - 1)];
    if (chosen === EMPTY) {
      clear(...address);
      return;
    }
    commit(chosen, ...address);
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
    // An interaction whose slots grow on demand refuses this for its trailing
    // "add another" position: tabbing through would otherwise answer every one.
    if (!autoFillOnFocus(...address)) {
      return;
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
    const options = optionsFor(address);
    if (options.length < 2) {
      return;
    }
    let next;
    if (event.key in ARROW_OFFSETS) {
      next = activeIndex(address) + ARROW_OFFSETS[event.key];
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = options.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    chooseAt(address, next);
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
     * The up/down affordance, telling a sighted keyboard learner that the slot's
     * value can be stepped. Decorative: the options below carry the value for a
     * screen reader, and CSS reveals this only while the slot has keyboard focus.
     * @returns {?object} The vnode for the stepper, or null while disabled
     */
    renderStepper() {
      if (isDisabled()) {
        return null;
      }
      return h('span', { class: 'qti-slot-stepper', attrs: { 'aria-hidden': 'true' } }, [
        h('KIcon', { props: { icon: 'chevronUp' }, class: 'qti-slot-stepper-icon' }),
        h('KIcon', { props: { icon: 'chevronDown' }, class: 'qti-slot-stepper-icon' }),
      ]);
    },

    /**
     * The options the slot owns. Visually hidden, so a screen reader steps
     * through the responses a sighted learner sees in the pool while the slot
     * shows only the current one.
     * @param {...(number|string)} address - The slot's address parts
     * @returns {object} The vnode for the slot's option list
     */
    renderOptions(...address) {
      const current = currentValue(...address) || EMPTY;
      return h(
        'ul',
        { class: 'qti-visually-hidden', attrs: { role: 'presentation' } },
        optionsFor(address).map((identifier, index) =>
          h(
            'li',
            {
              key: identifier || 'empty',
              attrs: {
                id: optionId(address, index),
                role: 'option',
                'aria-selected': String(identifier === current),
              },
            },
            identifier === EMPTY ? emptyOption$() : labelFor(identifier),
          ),
        ),
      );
    },
  };
}
