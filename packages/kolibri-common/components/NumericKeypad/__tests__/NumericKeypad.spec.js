import { h, nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import useKeypad from '../../../composables/useKeypad';
import numericKeypadStrings from '../../../strings/numericKeypadStrings';
import NumericKeypad from '../index.vue';

const { decimal$, delete$, pi$ } = numericKeypadStrings;

const ARABIC_INDIC_THREE = '٣';

const KEY_LABELS = {
  SIN: { label: 'sin', ariaLabel: 'Sine' },
  COS: { label: 'cos', ariaLabel: 'Cosine' },
  TAN: { label: 'tan', ariaLabel: 'Tangent' },
  LN: { label: 'ln', ariaLabel: 'Natural logarithm' },
  LOG: { label: 'log', ariaLabel: 'Logarithm with base 10' },
  LT: { label: '<', ariaLabel: 'Less than sign' },
  GT: { label: '>', ariaLabel: 'Greater than sign' },
  NEQ: { label: '≠', ariaLabel: 'Not-equals sign' },
  LEQ: { label: '≤', ariaLabel: 'Less than or equal sign' },
  GEQ: { label: '≥', ariaLabel: 'Greater than or equal to sign' },
  THETA: { label: 'θ', ariaLabel: 'Theta' },
};

async function renderKeypad(langId, { buttonSets, configuration } = {}) {
  let keypadAPI;
  const Host = {
    setup() {
      ({ keypadAPI } = useKeypad());
      return () =>
        h(NumericKeypad, {
          props: { lang: { id: langId }, buttonSets, keyLabels: KEY_LABELS },
        });
    },
  };
  render(Host);
  const keyHandler = jest.fn();
  keypadAPI.setKeyHandler(keyHandler);
  if (configuration) {
    keypadAPI.configure(configuration);
  }
  keypadAPI.activate();
  await nextTick();
  return { keyHandler };
}

function renderExpressionKeypad({ buttonSets = [], extraKeys = ['PI'] } = {}) {
  return renderKeypad('en', {
    buttonSets,
    configuration: { keypadType: 'EXPRESSION', extraKeys },
  });
}

function names(keys) {
  return keys.map(key => KEY_LABELS[key].ariaLabel);
}

describe('NumericKeypad', () => {
  it.each([
    ['en', '.'],
    ['hi', '.'],
    ['fr', ','],
  ])('labels the decimal key for %s with %s', async (langId, separator) => {
    await renderKeypad(langId);
    expect(screen.getByRole('button', { name: decimal$() })).toHaveTextContent(separator);
  });

  it('labels digits and decimal for ar-EG in Arabic-Indic glyphs', async () => {
    await renderKeypad('ar-EG');
    expect(screen.getByRole('button', { name: ARABIC_INDIC_THREE })).toBeVisible();
    expect(screen.getByRole('button', { name: decimal$() })).toHaveTextContent('٫');
  });

  describe('in an expression field', () => {
    it('shows a Delete key', async () => {
      await renderExpressionKeypad();
      expect(screen.getByRole('button', { name: delete$() })).toBeVisible();
    });

    it.each([
      ['trig', ['SIN', 'COS', 'TAN']],
      ['logarithms', ['LN', 'LOG']],
      ['basic relations', ['LT', 'GT']],
      ['advanced relations', ['NEQ', 'LEQ', 'GEQ']],
    ])('shows the %s keys the item asks for', async (buttonSet, keys) => {
      await renderExpressionKeypad({ buttonSets: ['basic', buttonSet] });
      for (const name of names(keys)) {
        expect(screen.getByRole('button', { name })).toBeVisible();
      }
    });

    it('leaves out keys the item does not ask for', async () => {
      await renderExpressionKeypad({ buttonSets: ['basic', 'trig'] });
      for (const name of names(['LN', 'LOG', 'LT', 'NEQ'])) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      }
    });

    it("shows the item's letters once each, with π only on the main grid", async () => {
      const letters = ['x', 'y'];
      await renderExpressionKeypad({ extraKeys: [...letters, 'THETA', 'PI'] });
      for (const letter of letters) {
        expect(screen.getByRole('button', { name: letter })).toHaveTextContent(letter);
      }
      const theta = KEY_LABELS.THETA;
      expect(screen.getByRole('button', { name: theta.ariaLabel })).toHaveTextContent(theta.label);
      expect(screen.getAllByRole('button', { name: pi$() })).toHaveLength(1);
    });

    it('presses the keypad key for a function key', async () => {
      const { keyHandler } = await renderExpressionKeypad({ buttonSets: ['trig'] });
      screen.getByRole('button', { name: KEY_LABELS.COS.ariaLabel }).click();
      expect(keyHandler).toHaveBeenCalledWith('COS');
    });

    it('shows a key both a button set and the item ask for once', async () => {
      await renderExpressionKeypad({ buttonSets: ['basic relations'], extraKeys: ['LT'] });
      expect(screen.getAllByRole('button', { name: KEY_LABELS.LT.ariaLabel })).toHaveLength(1);
    });

    it("puts the item's row before the digits in tab order", async () => {
      await renderExpressionKeypad({ buttonSets: ['trig'], extraKeys: ['x'] });
      const tabOrder = screen
        .getAllByRole('button')
        .map(button => button.getAttribute('aria-label'));
      expect(tabOrder.slice(0, 6)).toEqual([...names(['SIN', 'COS', 'TAN']), 'x', delete$(), '7']);
    });
  });

  it('shows no item keys for a number field', async () => {
    await renderKeypad('en', {
      buttonSets: ['trig', 'logarithms', 'basic relations', 'advanced relations'],
      configuration: { keypadType: 'FRACTION', extraKeys: ['x', 'THETA'] },
    });
    for (const name of [...names(Object.keys(KEY_LABELS)), 'x']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.getAllByRole('button', { name: delete$() })).toHaveLength(1);
  });
});
