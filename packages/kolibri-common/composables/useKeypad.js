import { ref, readonly, provide, inject } from 'vue';
import { getLocaleNumberSymbols } from '../utils/localeNumbers';
import { normalizeNumerals } from '../utils/numeralNormalization';

const KeypadSymbol = Symbol('keypad');

// Arabic keyboards type these for the decimal, as `readLocaleNumber` reads them.
const ARABIC_DECIMAL_KEYS = ['،', ','];

const KEYPAD_KEYS = {
  '/': 'FRAC_INCLUSIVE',
  '٫': 'DECIMAL',
  '.': 'DECIMAL',
  '+': 'PLUS',
  '-': 'MINUS',
  '%': 'PERCENT',
  '=': 'EQUAL',
  '>': 'GT',
  '<': 'LT',
  '^': 'EXP',
  Backspace: 'BACKSPACE',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
};

// Covers every key in @khanacademy/math-input's `domKeyToMathQuillKey`, digits included. When
// MathInput presses one of those itself, it resets its content, which moves the cursor out of any
// fraction or exponent.
function keypadKeyForKeyboardKey(key, language, useTimes) {
  if (key === '*') {
    return useTimes ? 'TIMES' : 'CDOT';
  }
  if (KEYPAD_KEYS[key]) {
    return KEYPAD_KEYS[key];
  }
  if (/^\p{Nd}$/u.test(key)) {
    return `NUM_${normalizeNumerals(key)}`;
  }
  const { digits, decimal } = getLocaleNumberSymbols(language);
  const decimalKeys = /[٠-٩۰-۹]/.test(digits[0]) ? [decimal, ...ARABIC_DECIMAL_KEYS] : [decimal];
  return decimalKeys.includes(key) ? 'DECIMAL' : null;
}

/**
 * Composable that owns the keypad state and exposes the KeypadAPI interface
 * expected by Perseus widgets.
 *
 * Call this in the parent component's setup(). It provides keypad state to
 * descendants via provide/inject. Child components use injectKeypad() to
 * access the keypad.
 *
 * Returns the keypadAPI (for passing to Perseus as keypadElement) and a
 * keypadContextValue (for bridging React's KeypadContext.Provider).
 * @returns {{ keypadAPI: object, keypadContextValue: object, handleKeyboardEvent: Function }}
 */
export default function useKeypad() {
  const active = ref(false);
  const cursor = ref(null);
  const keypadConfig = ref(null);
  const keyHandler = ref(null);

  function activate() {
    active.value = true;
    keypadContextValue.keypadActive = true;
  }

  function dismiss() {
    active.value = false;
    // Clear the bridge flag too, or MathInput's click-to-reshow guard
    // (focused && !keypadActive) sees it stale and only reshows on a fresh focus.
    keypadContextValue.keypadActive = false;
  }

  function configure(configuration, cb) {
    keypadConfig.value = configuration;
    if (cb) {
      setTimeout(cb);
    }
  }

  function setCursor(c) {
    cursor.value = c;
  }

  function setKeyHandler(handler) {
    keyHandler.value = handler;
  }

  function handleKeyPress(keyId) {
    if (keyHandler.value) {
      cursor.value = keyHandler.value(keyId);
    }
  }

  const keydownWasShortcut = new Map();

  /**
   * On keyup, presses the keypad key a physical key types in `language`. On keydown, cancels the
   * default action of a key it will press.
   * @param {KeyboardEvent} event - A keydown or keyup in a math field
   * @param {string} [language] - BCP 47 tag of the content
   * @returns {boolean} Whether a keyup was handled, by pressing a keypad key or by ignoring a
   * Ctrl or Cmd shortcut
   */
  function handleKeyboardEvent(event, language) {
    // Windows reports AltGr as Ctrl+Alt.
    const isShortcut = event.metaKey || (event.ctrlKey && !event.getModifierState('AltGraph'));
    const keyId = keyHandler.value
      ? keypadKeyForKeyboardKey(event.key, language, keypadConfig.value?.times)
      : null;
    if (event.type === 'keydown') {
      keydownWasShortcut.set(event.code, isShortcut);
      // Android WebView moves focus out of the field by spatial navigation on arrow keydowns.
      if (keyId && !isShortcut) {
        event.preventDefault();
      }
      return false;
    }
    const wasShortcut = keydownWasShortcut.get(event.code) ?? isShortcut;
    keydownWasShortcut.delete(event.code);
    if (wasShortcut) {
      return true;
    }
    if (keyId) {
      handleKeyPress(keyId);
      return true;
    }
    return false;
  }

  // The API object passed to Perseus as keypadElement.
  // This must remain a stable reference — Perseus stores it.
  const keypadAPI = {
    activate,
    dismiss,
    configure,
    setCursor,
    setKeyHandler,
    // getDOMNode is called by MathInput to detect clicks outside the keypad.
    // We set this later once the keypad component mounts.
    getDOMNode: () => keypadAPI._domNode || null,
    _domNode: null,
  };

  // Bridge React's KeypadContext to our Vue keypad state.
  // MathInput calls setKeypadActive(true) on focus — this must
  // reach our Vue keypad's activate/dismiss.
  const keypadContextValue = {
    keypadActive: false,
    setKeypadActive: isActive => {
      if (isActive) {
        activate();
      } else {
        dismiss();
      }
    },
    keypadElement: keypadAPI,
    setKeypadElement: () => {},
    renderer: null,
    setRenderer: () => {},
    scrollableElement: null,
    setScrollableElement: () => {},
  };

  provide(KeypadSymbol, {
    active: readonly(active),
    keypadConfig: readonly(keypadConfig),
    dismiss,
    handleKeyPress,
    activate,
    configure,
    setCursor,
    setKeyHandler,
    setDOMNode(el) {
      keypadAPI._domNode = el;
    },
  });

  return {
    keypadAPI,
    keypadContextValue,
    handleKeyboardEvent,
  };
}

/**
 * @typedef {object} KeypadContext
 * @property {import('vue').Ref<boolean>} active - True while the keypad is open
 * @property {import('vue').Ref<object>} keypadConfig - Keys and input mode to display
 * @property {() => void} dismiss - Hide the keypad
 * @property {Function} handleKeyPress - Forward a child's key press
 * @property {() => void} activate - Show the keypad
 * @property {(configuration: object, cb?: Function) => void} configure - Set keypad layout/config
 * @property {(cursor: unknown) => void} setCursor - Update the opaque cursor value
 * @property {(handler: (keyId: string) => unknown) => void} setKeyHandler - Register the
 * handler invoked on each key press; its return value becomes the new cursor
 * @property {(el: HTMLElement) => void} setDOMNode - Register the keypad DOM node
 */

/**
 * Inject keypad state provided by a parent useKeypad() call.
 * Use this in child components that need to interact with the keypad.
 * @returns {KeypadContext|undefined}
 */
export function injectKeypad() {
  return inject(KeypadSymbol);
}
