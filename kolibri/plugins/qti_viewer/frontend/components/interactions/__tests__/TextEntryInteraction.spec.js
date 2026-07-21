import { fireEvent, screen, waitFor } from '@testing-library/vue';
import numericKeypadStrings from 'kolibri-common/strings/numericKeypadStrings';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';

const {
  negative$,
  percent$,
  pi$,
  fractionExcludingExpression$,
  upArrow$,
  downArrow$,
  leftArrow$,
  rightArrow$,
  delete$,
} = numericKeypadStrings;

// Every QTI text-entry fixture: confirms it parses and renders the expected input count.
// A successful render-and-count implicitly asserts the XML parsed without error.
// All text-entry inputs render as type="text" regardless of base-type (see 'string vs
// numeric text entry' below), so a plain textbox count is sufficient here now.
const smokeFixtures = [
  ['q20-textentry', 1],
  ['q20-textentry-sv-3', 1],
  ['q20-textentry-composite', 17],
  ['card-08a-baseline', 1],
  ['Example03-feedbackBlock-solution-qti3', 1],
  ['amp-07-nextgen', 1],
  ['amp-07-nextgen-a', 1],
];

describe('Smoke', () => {
  it.each(smokeFixtures)('%s renders %d inputs', (id, inputCount) => {
    renderAssessmentItem(items[id].xml);
    expect(screen.getAllByRole('textbox')).toHaveLength(inputCount);
  });
});

describe('Answer guide', () => {
  it('shows the short-answer guide text', () => {
    renderAssessmentItem(items['q20-textentry'].xml);
    expect(screen.getByText(answerGuideStrings.shortAnswer$())).toBeVisible();
  });
});

// Behavior tests run once per base type. Both render type="text" now (numeric fields use
// inputmode="decimal" instead of type="number", so the keypad can use selectionStart/
// selectionEnd for caret-based insertion) — the split here is about response coercion and
// keypad engagement, not about DOM input type.
const variants = [
  {
    label: 'string',
    fixtureId: 'q20-textentry',
    typedValue: 'hello',
    storedValue: 'hello',
    responseIdentifier: 'RESPONSE',
  },
  {
    label: 'numeric',
    fixtureId: 'amp-07-nextgen',
    typedValue: '42',
    storedValue: 42,
    responseIdentifier: 'RESPONSE',
  },
];

describe.each(variants)('$label text entry', variant => {
  const xml = () => items[variant.fixtureId].xml;

  it('renders a text input', () => {
    renderAssessmentItem(xml());
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  it('exposes an accessible label and disables autocomplete', () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    expect(input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')).toBe(true);
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('updates value when typed into', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, variant.typedValue);
    // DOM value is always the string form; the coerced/typed response value
    // (e.g. a real number for numeric base-types) is asserted separately below.
    expect(input).toHaveValue(variant.typedValue);
  });

  it('round-trips answer state', async () => {
    const { checkAnswer, setAnswerState } = renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');

    await fireEvent.update(input, variant.typedValue);
    const result = checkAnswer();
    expect(result.answerState[variant.responseIdentifier]).toEqual(variant.storedValue);

    setAnswerState({});
    await screen.findByRole('textbox');
    expect(screen.getByRole('textbox')).toHaveValue('');

    setAnswerState(result.answerState);
    await screen.findByRole('textbox');
    expect(screen.getByRole('textbox')).toHaveValue(variant.typedValue);
  });

  it('restores value from injected answerState on mount', () => {
    renderAssessmentItem(xml(), {
      answerState: { [variant.responseIdentifier]: variant.storedValue },
    });
    expect(screen.getByRole('textbox')).toHaveValue(variant.typedValue);
  });

  it('shows read-only div when not interactive', () => {
    renderAssessmentItem(xml(), { interactive: false });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

// Regression coverage for the `0`-is-falsy bug: `value || placeholder` / `value || ''`
// treats a legitimate zero answer as empty.
describe('Zero value handling (regression)', () => {
  const xml = () => items['amp-07-nextgen'].xml;

  it('displays 0 in the editable field rather than falling back to empty', () => {
    renderAssessmentItem(xml(), { answerState: { RESPONSE: 0 } });
    expect(screen.getByRole('textbox')).toHaveValue('0');
  });

  it('displays 0 in report mode rather than the placeholder', () => {
    renderAssessmentItem(xml(), { answerState: { RESPONSE: 0 }, interactive: false });
    expect(screen.getByText('0', { selector: '.qti-text-entry-interaction-report' })).toBeVisible();
  });
});

// `qti-input-width-N`
describe('Custom widths', () => {
  it('sizes each field to the character count named by its qti-input-width class', () => {
    renderAssessmentItem(items['q20-textentry-composite'].xml);
    const widths = screen.getAllByRole('textbox').map(input => input.style.width);
    expect(widths).toEqual([
      // the fixture leads with an unsized field, then walks the width vocabulary
      '',
      ...[1, 2, 3, 4, 5, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 72].map(
        chars => `calc(${chars}ch + 18px)`,
      ),
    ]);
  });

  it('caps a sized field at the width of its container', () => {
    renderAssessmentItem(items['q20-textentry-composite'].xml);
    expect(screen.getAllByRole('textbox')[16]).toHaveStyle({ maxWidth: '100%' });
  });

  it('applies the same width in report mode', () => {
    renderAssessmentItem(items['amp-07-nextgen'].xml, { interactive: false });
    expect(document.querySelector('.qti-text-entry-interaction-report')).toHaveStyle({
      width: 'calc(10ch + 18px)',
    });
  });

  it('falls back to an expected-length minimum when no width class is given', () => {
    renderAssessmentItem(items['q20-textentry'].xml);
    const input = screen.getByRole('textbox');
    expect(input).toHaveStyle({ width: '' });
    expect(input).toHaveStyle({ minWidth: '20ch' });
  });
});

describe('Numeric keypad', () => {
  const xml = () => items['amp-07-nextgen'].xml;

  it('opens on focus for a numeric field', async () => {
    renderAssessmentItem(xml());
    await fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByRole('button', { name: negative$() })).toBeVisible();
  });

  it('does not open for a string field', async () => {
    renderAssessmentItem(items['q20-textentry'].xml);
    await fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.queryByRole('button', { name: negative$() })).not.toBeInTheDocument();
  });

  it('excludes %, π, and ⁄ from the rendered keys', async () => {
    renderAssessmentItem(xml());
    await fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.queryByRole('button', { name: percent$() })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: pi$() })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: fractionExcludingExpression$() }),
    ).not.toBeInTheDocument();
  });

  it('excludes vertical nav (UP/DOWN) but keeps LEFT/RIGHT', async () => {
    renderAssessmentItem(xml());
    await fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.queryByRole('button', { name: upArrow$() })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: downArrow$() })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: leftArrow$() })).toBeVisible();
    expect(screen.getByRole('button', { name: rightArrow$() })).toBeVisible();
  });

  it('closes on blur', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    expect(screen.getByRole('button', { name: negative$() })).toBeVisible();

    await fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: negative$() })).not.toBeInTheDocument();
    });
  });

  // regression coverage
  it('pressing the negative-sign key on an empty field does not throw', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    await fireEvent.click(screen.getByRole('button', { name: negative$() }));
    expect(input).toHaveValue('-');
  });

  it('committing a digit after the negative sign updates the response', async () => {
    const { checkAnswer } = renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    await fireEvent.click(screen.getByRole('button', { name: negative$() }));
    await fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(input).toHaveValue('-3');
    expect(checkAnswer().answerState.RESPONSE).toEqual(-3);
  });

  it('backspace removes the character before the caret', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    await fireEvent.click(screen.getByRole('button', { name: '1' }));
    await fireEvent.click(screen.getByRole('button', { name: '2' }));
    await fireEvent.click(screen.getByRole('button', { name: delete$() }));

    expect(input).toHaveValue('1');
  });

  it('inserts a digit at the caret position, not just at the end', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    await fireEvent.click(screen.getByRole('button', { name: '1' }));
    await fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(input).toHaveValue('12');

    await fireEvent.click(screen.getByRole('button', { name: leftArrow$() }));
    await fireEvent.click(screen.getByRole('button', { name: '9' }));

    expect(input).toHaveValue('192');
  });
});
