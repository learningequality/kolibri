import { fireEvent, screen, waitFor } from '@testing-library/vue';
import numericKeypadStrings from 'kolibri-common/strings/numericKeypadStrings';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';

// MathML fixtures take SafeHTML's MathJax path in jsdom, which has no layout;
// its font URL needs plugin URL data that tests lack.
jest.mock('kolibri/urls');

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
  decimal$,
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
    expect(result.answerState.responses[variant.responseIdentifier]).toEqual(variant.storedValue);

    setAnswerState({});
    await screen.findByRole('textbox');
    expect(screen.getByRole('textbox')).toHaveValue('');

    setAnswerState(result.answerState);
    await screen.findByRole('textbox');
    expect(screen.getByRole('textbox')).toHaveValue(variant.typedValue);
  });

  it('restores value from injected answerState on mount', () => {
    renderAssessmentItem(xml(), {
      answerState: { responses: { [variant.responseIdentifier]: variant.storedValue } },
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
    renderAssessmentItem(xml(), { answerState: { responses: { RESPONSE: 0 } } });
    expect(screen.getByRole('textbox')).toHaveValue('0');
  });

  it('displays 0 in report mode rather than the placeholder', () => {
    renderAssessmentItem(xml(), {
      answerState: { responses: { RESPONSE: 0 } },
      interactive: false,
    });
    expect(screen.getByText('0', { selector: '.qti-text-entry-interaction-report' })).toBeVisible();
  });
});

// Regression coverage for #13804: an unanswered question must render as an empty
// field in report mode, not fall back to displaying its placeholder-text as though
// it were the learner's response.
describe('Report mode placeholder (regression)', () => {
  const xml = () => items['q20-textentry-placeholder'].xml;
  const placeholderText = 'e.g. jumped';
  const typedResponse = 'leapt';

  it('renders an empty field when there is no response, instead of the placeholder', () => {
    renderAssessmentItem(xml(), { interactive: false });
    expect(document.querySelector('.qti-text-entry-interaction-report')).toHaveTextContent('');
    expect(screen.queryByText(placeholderText)).not.toBeInTheDocument();
  });

  it('still displays a real response when one was given', () => {
    renderAssessmentItem(xml(), {
      answerState: { responses: { RESPONSE: typedResponse } },
      interactive: false,
    });
    expect(
      screen.getByText(typedResponse, { selector: '.qti-text-entry-interaction-report' }),
    ).toBeVisible();
  });

  it('still shows the placeholder as input hint text while answering', () => {
    renderAssessmentItem(xml());
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', placeholderText);
  });
});

// pattern-mask
describe('Pattern mask', () => {
  // pattern-mask="([0-9.]{0,6})" with a data-patternmask-message
  const xml = () => items['q20-textentry-sv-3'].xml;
  const patternMessage = 'Maximum of 6 digits or decimal points permitted';

  it('does not flag an invalid value while it is still being typed', async () => {
    renderAssessmentItem(xml());
    await fireEvent.update(screen.getByRole('textbox'), '1234567');
    expect(screen.queryByText(patternMessage)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('flags an invalid value once the field is left', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1234567');
    await fireEvent.blur(input);
    expect(screen.getByText(patternMessage)).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('points the input at its message via aria-describedby', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1234567');
    await fireEvent.blur(input);
    const messageId = input.getAttribute('aria-describedby');
    expect(messageId).toBeTruthy();
    expect(document.getElementById(messageId)).toHaveTextContent(patternMessage);
  });

  it('accepts a value that satisfies the mask', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '12.34');
    await fireEvent.blur(input);
    expect(screen.queryByText(patternMessage)).not.toBeInTheDocument();
  });

  it('does not flag an empty field', async () => {
    renderAssessmentItem(xml());
    await fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryByText(patternMessage)).not.toBeInTheDocument();
  });

  // The mask is presentational: a response that violates it is still recorded, so the
  // learner's work is never silently discarded.
  it('still records a response that violates the mask', async () => {
    const { checkAnswer } = renderAssessmentItem(xml());
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1234567');
    await fireEvent.blur(input);
    expect(checkAnswer().answerState.responses.RESPONSE).toBe('1234567');
  });

  // An unparseable mask is an authoring error in the item; it must not break the question.
  // The accompanying warning can't be asserted here — setup.js silences kolibri-logging.
  it('ignores a malformed mask instead of throwing', async () => {
    // Anchored on the hyphenated attribute: the item body also describes its own mask in
    // prose as `patternmask="([0-9.]{0,6})"`, which a plain string replace would hit first.
    renderAssessmentItem(xml().replace(/pattern-mask="[^"]*"/, 'pattern-mask="[unclosed"'));
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1234567');
    await fireEvent.blur(input);
    expect(input).toHaveValue('1234567');
    expect(screen.queryByText(patternMessage)).not.toBeInTheDocument();
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
    expect(checkAnswer().answerState.responses.RESPONSE).toEqual(-3);
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

const ARABIC_INDIC_THREE = '٣';
const ARABIC_INDIC_FIVE = '٥';
const NARROW_NO_BREAK_SPACE = '\u202f';

// Scores 1 when RESPONSE matches its correct response.
function numericItemXml(correct, baseType = 'float') {
  return `<qti-assessment-item>
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="${baseType}">
      <qti-correct-response><qti-value>${correct}</qti-value></qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
      <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-item-body><p><qti-text-entry-interaction response-identifier="RESPONSE"/></p></qti-item-body>
    <qti-response-processing>
      <qti-response-condition>
        <qti-response-if>
          <qti-match>
            <qti-variable identifier="RESPONSE"/>
            <qti-correct identifier="RESPONSE"/>
          </qti-match>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">1</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-if>
      </qti-response-condition>
    </qti-response-processing>
  </qti-assessment-item>`;
}

describe('Numbers in the content language', () => {
  it.each([
    ['fr', '1,5', '1.5'],
    ['fr', '1.5', '1.5'],
    ['fr', '1 234,5', '1234.5'],
    ['fr', `1${NARROW_NO_BREAK_SPACE}234,5`, '1234.5'],
    ['en', '1,234.5', '1234.5'],
    ['en', '1,23', '123'],
    ['hi', '12,34,567', '1234567'],
    ['hi', '३०', '30'],
    ['ar', '٣٠', '30'],
    ['ar', '٣.٥', '3.5'],
  ])('%s reads %s as %s', async (lang, typed, correct) => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml(correct), { lang });
    await fireEvent.update(screen.getByRole('textbox'), typed);
    expect(checkAnswer().outcomes.SCORE).toBe(1);
  });

  it.each([
    ['fr', '1,5'],
    ['en', '1.5'],
    ['hi', '1.5'],
  ])('%s keypad writes %s', async (lang, written) => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml('1.5'), { lang });
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    await fireEvent.click(screen.getByRole('button', { name: '1' }));
    await fireEvent.click(screen.getByRole('button', { name: decimal$() }));
    await fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(input).toHaveValue(written);
    expect(checkAnswer().outcomes.SCORE).toBe(1);
  });

  it('reads keyboard digits beside the keypad decimal in Persian', async () => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml('3.5'), { lang: 'fa' });
    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    await fireEvent.update(input, '3');
    await fireEvent.click(screen.getByRole('button', { name: decimal$() }));
    await fireEvent.update(input, `${input.value}5`);
    await fireEvent.blur(input);
    expect(checkAnswer().outcomes.SCORE).toBe(1);
  });

  it.each([
    ['en', '1.5', '1', '1'],
    ['fr', '1,5', '1', '1'],
  ])('%s integer field reads %s as %s', async (lang, typed, stored, shown) => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml(stored, 'integer'), { lang });
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, typed);
    await fireEvent.blur(input);
    expect(input).toHaveValue(shown);
    expect(checkAnswer().outcomes.SCORE).toBe(1);
  });

  it.each([
    ['en', '1.5'],
    ['fr', '1,5'],
  ])('%s integer field typed %s a key at a time shows what it stored', async (lang, typed) => {
    renderAssessmentItem(numericItemXml('1', 'integer'), { lang });
    const input = screen.getByRole('textbox');
    for (let end = 1; end <= typed.length; end++) {
      await fireEvent.update(input, typed.slice(0, end));
    }
    await fireEvent.blur(input);
    expect(input).toHaveValue('1');
  });

  it.each([
    ['ar', '٣٠'],
    ['bn', '0.5'],
    ['ar-EG', '1.5'],
  ])('%s keeps %s as typed once the field is left', async (lang, typed) => {
    renderAssessmentItem(numericItemXml('1'), { lang });
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, typed);
    await fireEvent.blur(input);
    expect(input).toHaveValue(typed);
  });

  it('reads keypad input in Arabic-Indic digits', async () => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml('3.5'), { lang: 'ar-EG' });
    await fireEvent.focus(screen.getByRole('textbox'));
    await fireEvent.click(screen.getByRole('button', { name: ARABIC_INDIC_THREE }));
    await fireEvent.click(screen.getByRole('button', { name: decimal$() }));
    await fireEvent.click(screen.getByRole('button', { name: ARABIC_INDIC_FIVE }));
    expect(checkAnswer().outcomes.SCORE).toBe(1);
  });

  it.each([
    ['fr', 1234.5, '1234,5'],
    ['ar-EG', 30, '٣٠'],
    ['en', 1234.5, '1234.5'],
    ['hi', 1234.5, '1234.5'],
  ])('%s shows %s as %s in report mode', (lang, stored, shown) => {
    renderAssessmentItem(numericItemXml(stored), {
      lang,
      answerState: { RESPONSE: stored },
      interactive: false,
    });
    expect(screen.getByTestId('text-entry-report')).toHaveTextContent(shown);
  });

  it('toggles a minus written as U+2212 off with the negative-sign key', async () => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml('3'), {
      lang: 'sv',
      answerState: { RESPONSE: -3 },
    });
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('−3');
    await fireEvent.focus(input);
    await fireEvent.click(screen.getByRole('button', { name: negative$() }));
    expect(input).toHaveValue('3');
    expect(checkAnswer().outcomes.SCORE).toBe(1);
  });

  it('keeps a restored value when the field is focused and left', async () => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml('1.5'), {
      lang: 'de',
      answerState: { RESPONSE: 1.5 },
    });
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('1,5');
    await fireEvent.focus(input);
    await fireEvent.blur(input);
    expect(checkAnswer().answerState.RESPONSE).toBe(1.5);
  });

  it('clears the response when the field is cleared', async () => {
    const { checkAnswer } = renderAssessmentItem(numericItemXml('1.5'), { lang: 'fr' });
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1,5');
    await fireEvent.update(input, ' ');
    await fireEvent.blur(input);
    expect(checkAnswer().answerState.RESPONSE).toBeNull();
  });

  it('checks the pattern mask against the number, not its language form', async () => {
    renderAssessmentItem(
      numericItemXml('3.5').replace(
        '<qti-text-entry-interaction ',
        '<qti-text-entry-interaction pattern-mask="([0-9.\\-]{0,8})" ',
      ),
      { lang: 'fr' },
    );
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '3,5');
    await fireEvent.blur(input);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it.each([
    ['[0-9]+\\.[0-9]{2}', '1.50', 'en'],
    ['[0-9]+\\.[0-9]{2}', '1,50', 'fr'],
    ['[0-9]{3}', '007', 'en'],
  ])('checks the mask %s against %s (%s) as the field keeps it', async (mask, typed, lang) => {
    renderAssessmentItem(
      numericItemXml('1.5').replace(
        '<qti-text-entry-interaction ',
        `<qti-text-entry-interaction pattern-mask="${mask}" `,
      ),
      { lang },
    );
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, typed);
    await fireEvent.blur(input);
    expect(input).toHaveValue(typed);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('shows how a typed number was read once the field is left', async () => {
    renderAssessmentItem(numericItemXml('15'), { lang: 'de' });
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1.5');
    await fireEvent.blur(input);
    expect(input).toHaveValue('15');
  });

  it('keeps a small number as typed', async () => {
    renderAssessmentItem(numericItemXml('0.0000001'), { lang: 'fr' });
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '0,0000001');
    expect(input).toHaveValue('0,0000001');
  });

  it('leaves a partial entry in the field', async () => {
    renderAssessmentItem(numericItemXml('1.5'), { lang: 'fr' });
    const input = screen.getByRole('textbox');
    await fireEvent.update(input, '1');
    await fireEvent.update(input, '1,');
    expect(input).toHaveValue('1,');
    await fireEvent.update(input, '-');
    expect(input).toHaveValue('-');
  });
});
