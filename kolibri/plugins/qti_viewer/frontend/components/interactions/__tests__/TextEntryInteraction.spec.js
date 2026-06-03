import { fireEvent, screen } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';

// Every QTI text-entry fixture: confirms it parses and renders the expected input count.
// A successful render-and-count implicitly asserts the XML parsed without error.
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
    const textboxes = screen.queryAllByRole('textbox');
    const spinbuttons = screen.queryAllByRole('spinbutton');
    expect(textboxes.length + spinbuttons.length).toBe(inputCount);
  });
});

// Behavior tests run once per base type — the component has distinct code paths
// for string (textbox) vs numeric (spinbutton) inputs.
const variants = [
  {
    label: 'string',
    fixtureId: 'q20-textentry',
    role: 'textbox',
    htmlType: 'text',
    typedValue: 'hello',
    storedValue: 'hello',
    emptyValue: '',
    responseIdentifier: 'RESPONSE',
  },
  {
    label: 'number',
    fixtureId: 'amp-07-nextgen',
    role: 'spinbutton',
    htmlType: 'number',
    typedValue: '42',
    storedValue: 42,
    emptyValue: null,
    responseIdentifier: 'RESPONSE',
  },
];

describe.each(variants)('$label text entry', variant => {
  const xml = () => items[variant.fixtureId].xml;

  it(`renders an input of type ${'$htmlType'}`, () => {
    renderAssessmentItem(xml());
    expect(screen.getByRole(variant.role)).toHaveAttribute('type', variant.htmlType);
  });

  it('exposes an accessible label and disables autocomplete', () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole(variant.role);
    expect(input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')).toBe(true);
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('updates value when typed into', async () => {
    renderAssessmentItem(xml());
    const input = screen.getByRole(variant.role);
    await fireEvent.update(input, variant.typedValue);
    expect(input).toHaveValue(variant.storedValue);
  });

  it('round-trips answer state', async () => {
    const { checkAnswer, setAnswerState } = renderAssessmentItem(xml());
    const input = screen.getByRole(variant.role);

    await fireEvent.update(input, variant.typedValue);
    const result = checkAnswer();
    expect(result.answerState[variant.responseIdentifier]).toEqual(variant.storedValue);

    setAnswerState({});
    await screen.findByRole(variant.role);
    expect(input).toHaveValue(variant.emptyValue);

    setAnswerState(result.answerState);
    await screen.findByRole(variant.role);
    expect(input).toHaveValue(variant.storedValue);
  });

  it('restores value from injected answerState on mount', () => {
    renderAssessmentItem(xml(), {
      answerState: { [variant.responseIdentifier]: variant.storedValue },
    });
    expect(screen.getByRole(variant.role)).toHaveValue(variant.storedValue);
  });

  it('shows read-only div when not interactive', () => {
    renderAssessmentItem(xml(), { interactive: false });
    expect(screen.queryByRole(variant.role)).not.toBeInTheDocument();
  });
});
