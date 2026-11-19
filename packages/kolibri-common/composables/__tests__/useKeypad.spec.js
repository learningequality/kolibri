import { h } from 'vue';
import { render } from '@testing-library/vue';
import useKeypad from '../useKeypad';

function setUpKeypad() {
  let keypad;
  render({
    setup() {
      keypad = useKeypad();
      return () => h('div');
    },
  });
  const keyHandler = jest.fn();
  keypad.keypadAPI.setKeyHandler(keyHandler);
  return { handleKeyboardEvent: keypad.handleKeyboardEvent, keyHandler };
}

function keyup(key, modifiers = {}) {
  return new KeyboardEvent('keyup', { key, ...modifiers });
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
    ['en', '*', 'TIMES'],
    ['en', '%', 'PERCENT'],
    ['en', '=', 'EQUAL'],
    ['en', '<', 'LT'],
    ['en', '>', 'GT'],
    ['en', '^', 'EXP'],
    ['en', 'Backspace', 'BACKSPACE'],
    ['en', 'ArrowLeft', 'LEFT'],
    ['en', 'ArrowRight', 'RIGHT'],
  ])('on %s content presses %s as %s', (language, key, keyId) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(handleKeyboardEvent(keyup(key), language)).toBe(true);
    expect(keyHandler).toHaveBeenCalledWith(keyId);
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

  it('presses a key typed with AltGr', () => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    const altGr = { ctrlKey: true, altKey: true, modifierAltGraph: true };
    expect(handleKeyboardEvent(keyup('*', altGr), 'hu')).toBe(true);
    expect(keyHandler).toHaveBeenCalledWith('TIMES');
  });

  it.each([
    ['en', ','],
    ['en', '،'],
    ['fr', '،'],
    ['en', 'a'],
    ['en', 'Enter'],
  ])('on %s content leaves %s to Perseus', (language, key) => {
    const { handleKeyboardEvent, keyHandler } = setUpKeypad();
    expect(handleKeyboardEvent(keyup(key), language)).toBe(false);
    expect(keyHandler).not.toHaveBeenCalled();
  });
});
