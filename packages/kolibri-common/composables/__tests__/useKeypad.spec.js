import { h } from 'vue';
import { render } from '@testing-library/vue';
import useKeypad from '../useKeypad';

function setUpKeypad(keypadType = 'FRACTION') {
  let keypad;
  render({
    setup() {
      keypad = useKeypad();
      return () => h('div');
    },
  });
  const keyHandler = jest.fn();
  keypad.keypadAPI.configure({ keypadType });
  keypad.keypadAPI.setKeyHandler(keyHandler);
  return {
    handleKeyboardEvent: keypad.handleKeyboardEvent,
    configure: keypad.keypadAPI.configure,
    keyHandler,
  };
}

function keyup(key, modifiers = {}) {
  return new KeyboardEvent('keyup', { key, ...modifiers });
}

function keydown(key, modifiers = {}) {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers });
}

function typeKey(handleKeyboardEvent, key, language) {
  handleKeyboardEvent(keydown(key), language);
  return handleKeyboardEvent(keyup(key), language);
}

describe('useKeypad handleKeyboardEvent', () => {
  it.each([
    ['fr', ',', 'DECIMAL'],
    ['ar-EG', '٫', 'DECIMAL'],
    ['ar-EG', '،', 'DECIMAL'],
    ['ar-EG', ',', 'DECIMAL'],
    ['fa', '٫', 'DECIMAL'],
    ['en', '٫', 'DECIMAL'],
    ['en', '.', 'DECIMAL'],
    ['fr', '.', 'DECIMAL'],
    ['ar-EG', '٠', 'NUM_0'],
    ['ar-EG', '٥', 'NUM_5'],
    ['fa', '۷', 'NUM_7'],
    ['en', '٣', 'NUM_3'],
    ['en', '३', 'NUM_3'],
    ['en', '/', 'FRAC_INCLUSIVE'],
    ['ar-EG', '/', 'FRAC_INCLUSIVE'],
    ['en', '+', 'PLUS'],
    ['en', '-', 'MINUS'],
    ['en', '*', 'CDOT'],
    ['en', '%', 'PERCENT'],
    ['en', '=', 'EQUAL'],
    ['en', '<', 'LT'],
    ['en', '>', 'GT'],
    ['en', '^', 'EXP'],
    ['en', 'Backspace', 'BACKSPACE'],
    ['en', 'ArrowLeft', 'LEFT'],
    ['en', 'ArrowRight', 'RIGHT'],
    ['en', 'ArrowUp', 'UP'],
    ['en', 'ArrowDown', 'DOWN'],
  ])('on %s content presses %s as %s', (language, key, keyId) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(typeKey(handleKeyboardEvent, key, language)).toBe(true);
    expect(keyHandler.mock.calls).toEqual([[keyId]]);
  });

  it('presses overlapping keys in the order they go down', () => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad('EXPRESSION');
    handleKeyboardEvent(keydown('s', { code: 'KeyS' }), 'en');
    handleKeyboardEvent(keydown('e', { code: 'KeyE' }), 'en');
    expect(handleKeyboardEvent(keyup('e', { code: 'KeyE' }), 'en')).toBe(true);
    expect(handleKeyboardEvent(keyup('s', { code: 'KeyS' }), 'en')).toBe(true);
    expect(keyHandler.mock.calls).toEqual([['s'], ['e']]);
  });

  it('presses a held key on every repeat', () => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    handleKeyboardEvent(keydown('5', { code: 'Digit5' }), 'en');
    handleKeyboardEvent(keydown('5', { code: 'Digit5', repeat: true }), 'en');
    handleKeyboardEvent(keyup('5', { code: 'Digit5' }), 'en');
    expect(keyHandler.mock.calls).toEqual([['NUM_5'], ['NUM_5']]);
  });

  it.each([
    ['-', { ctrlKey: true }],
    ['=', { ctrlKey: true }],
    ['Backspace', { ctrlKey: true }],
    ['ArrowLeft', { metaKey: true }],
    ['a', { ctrlKey: true }],
  ])('swallows %s pressed with %o', (key, modifiers) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(handleKeyboardEvent(keyup(key, modifiers), 'en')).toBe(true);
    expect(keyHandler).not.toHaveBeenCalled();
  });

  it.each([
    ['-', 'Minus', { ctrlKey: true }],
    ['=', 'Equal', { metaKey: true }],
  ])('swallows %s when %s is released after the modifier in %o', (key, code, modifiers) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(handleKeyboardEvent(keydown(key, { code, ...modifiers }), 'en')).toBe(false);
    expect(handleKeyboardEvent(keyup(key, { code }), 'en')).toBe(true);
    expect(keyHandler).not.toHaveBeenCalled();
  });

  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', '5', '/'])(
    'cancels the default action of a %s keydown',
    key => {
      const { handleKeyboardEvent } = setUpKeypad();
      const event = keydown(key);
      handleKeyboardEvent(event, 'en');
      expect(event.defaultPrevented).toBe(true);
    },
  );

  it.each([
    ['ArrowRight', { ctrlKey: true }],
    ['Tab', {}],
    ['a', {}],
  ])('keeps the default action of a %s keydown with %o', (key, modifiers) => {
    const { handleKeyboardEvent } = setUpKeypad();
    const event = keydown(key, modifiers);
    handleKeyboardEvent(event, 'en');
    expect(event.defaultPrevented).toBe(false);
  });

  it('presses a key again once it is pressed without a modifier', () => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    handleKeyboardEvent(keydown('-', { code: 'Minus', ctrlKey: true }), 'en');
    handleKeyboardEvent(keydown('-', { code: 'Minus' }), 'en');
    expect(handleKeyboardEvent(keyup('-', { code: 'Minus' }), 'en')).toBe(true);
    expect(keyHandler.mock.calls).toEqual([['MINUS']]);
  });

  it('presses a key pressed before the modifier and released while it is held', () => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    handleKeyboardEvent(keydown('7', { code: 'Digit7' }), 'en');
    handleKeyboardEvent(keydown('Control', { code: 'ControlLeft', ctrlKey: true }), 'en');
    expect(handleKeyboardEvent(keyup('7', { code: 'Digit7', ctrlKey: true }), 'en')).toBe(true);
    expect(keyHandler.mock.calls).toEqual([['NUM_7']]);
  });

  it('presses * as TIMES when the keypad shows ×', () => {
    const { handleKeyboardEvent, configure, keyHandler } = setUpKeypad();
    configure({ times: true });
    expect(typeKey(handleKeyboardEvent, '*', 'en')).toBe(true);
    expect(keyHandler).toHaveBeenCalledWith('TIMES');
  });

  it('presses a key typed with AltGr', () => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    const altGr = { ctrlKey: true, altKey: true, modifierAltGraph: true };
    expect(handleKeyboardEvent(keydown('*', { code: 'Digit8', ...altGr }), 'hu')).toBe(false);
    expect(handleKeyboardEvent(keyup('*', { code: 'Digit8', ...altGr }), 'hu')).toBe(true);
    expect(keyHandler.mock.calls).toEqual([['CDOT']]);
  });

  it.each([
    ['en', '(', 'LEFT_PAREN'],
    ['en', ')', 'RIGHT_PAREN'],
    ['en', 'x', 'x'],
    ['fr', 'e', 'e'],
    ['en', 'X', 'X'],
  ])('in an expression field on %s content presses %s as %s', (language, key, keyId) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad('EXPRESSION');
    expect(typeKey(handleKeyboardEvent, key, language)).toBe(true);
    expect(keyHandler.mock.calls).toEqual([[keyId]]);
  });

  it.each(['x', '('])('in a number field leaves %s to Perseus', key => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(typeKey(handleKeyboardEvent, key, 'en')).toBe(false);
    expect(keyHandler).not.toHaveBeenCalled();
  });

  it.each([
    ['en', ','],
    ['en', '،'],
    ['fr', '،'],
    ['fr', 'é'],
    ['en', 'Shift'],
    ['en', 'Enter'],
  ])('on %s content leaves %s to Perseus', (language, key) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(typeKey(handleKeyboardEvent, key, language)).toBe(false);
    expect(keyHandler).not.toHaveBeenCalled();
  });
});
