import { ref, readonly, provide, inject } from 'vue';

const KeypadSymbol = Symbol('keypad');

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
 * @returns {{ keypadAPI: object, keypadContextValue: object }}
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
    setDOMNode(el) {
      keypadAPI._domNode = el;
    },
  });

  return {
    keypadAPI,
    keypadContextValue,
  };
}

/**
 * @typedef {object} KeypadContext
 * @property {import('vue').Ref<boolean>} active - True while the keypad is open
 * @property {import('vue').Ref<object>} keypadConfig - Keys and input mode to display
 * @property {() => void} dismiss - Hide the keypad
 * @property {Function} handleKeyPress - Forward a child's key press
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
