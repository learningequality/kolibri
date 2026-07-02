import { fireEvent, screen } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';

// Vue 2 drops aria-selected when bound to boolean false; SimpleChoice coerces to String()
// so the attribute always renders. This helper accepts either behavior.
function expectNotSelected(element) {
  const attr = element.getAttribute('aria-selected');
  expect(attr === null || attr === 'false').toBe(true);
}

// Every QTI choice fixture: confirms it parses and renders the expected choice count.
// A successful render-and-count implicitly asserts the XML parsed without error.
const smokeFixtures = [
  ['q2-choice-interaction-single-cardinality', 3],
  ['q2-choice-interaction-single-sv-1', 3],
  ['q2-choice-interaction-multiple-cardinality', 3],
  ['q2-choice-interaction-multiple-sv-1', 6],
  ['q2-choice-interaction-single-sv-4a', 6],
  ['q2-choice-interaction-single-sv-4b', 6],
  ['q2-choice-interaction-single-sv-4c', 48],
  ['q2-choice-interaction-single-sv-4d', 3],
  ['q2-choice-interaction-multiple-sv-4a', 12],
  ['q2-choice-interaction-multiple-sv-4b', 12],
  ['q2-choice-interaction-multiple-sv-4c', 54],
  ['q2-choice-interaction-multiple-sv-4d', 18],
  ['i9b-response-processing-fixed-template-match-correct-identifier', 2],
  ['i9b-response-processing-fixed-template-map-response-identifier', 6],
  ['ms-choice-templated-qti3', 5],
  ['mc-calc5-qti3', 3],
  ['sbac-choice-qti3', 5],
  ['a13-a15-captions-glossary', 4],
  ['sbac-choice-templated-qti3', 5],
];

describe('Smoke', () => {
  it.each(smokeFixtures)('%s renders %d choices', (id, choiceCount) => {
    renderAssessmentItem(items[id].xml);
    expect(screen.getAllByRole('option')).toHaveLength(choiceCount);
  });
});

function firstChoiceId(xml) {
  return xml.match(/qti-simple-choice identifier="([^"]+)"/)[1];
}

// Behavior tests run once per distinct code path, not per fixture — selection/keyboard/state
// come from component logic, not fixture content.
const singleFixture = {
  id: 'q2-choice-interaction-single-cardinality',
  responseIdentifier: 'RESPONSE',
};
const multiBoundedFixture = {
  id: 'q2-choice-interaction-multiple-cardinality',
  responseIdentifier: 'RESPONSE',
  maxChoices: 3,
};
const multiInteractionFixture = {
  id: 'q2-choice-interaction-single-sv-4a',
  listboxCount: 2,
};
const shuffleFixture = {
  id: 'mc-calc5-qti3',
  // mc-calc5-qti3 source order is Item0, Item1, Item2; choices are disambiguated
  // by the MathML placeholder each contains: Item0→Choix0, Item1→Choix2, Item2→Choix3.
  sourceOrder: ['Item0', 'Item1', 'Item2'],
  // Shuffle is seeded by candidateIdentifier ('shuffle-seed-001'), so this is deterministic.
  expectedShuffledOrder: ['Item1', 'Item2', 'Item0'],
};

function identifyShuffleChoice(text) {
  if (text.includes('Choix3')) return 'Item2';
  if (text.includes('Choix2')) return 'Item1';
  if (text.includes('Choix0')) return 'Item0';
  return null;
}

describe('Single cardinality', () => {
  const xml = () => items[singleFixture.id].xml;

  it('exposes role="option" with aria-selected on every choice', () => {
    renderAssessmentItem(xml());
    screen.getAllByRole('option').forEach(choice => {
      expect(choice).toHaveAttribute('aria-selected');
    });
  });

  it('exposes role="listbox" with aria-multiselectable="false"', () => {
    renderAssessmentItem(xml());
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'false');
  });

  it('selecting a choice deselects the previously selected one', async () => {
    renderAssessmentItem(xml());
    const choices = screen.getAllByRole('option');

    await fireEvent.click(choices[0]);
    expect(choices[0]).toHaveAttribute('aria-selected', 'true');

    await fireEvent.click(choices[1]);
    expect(choices[1]).toHaveAttribute('aria-selected', 'true');
    expectNotSelected(choices[0]);
  });

  it('clicking a selected choice deselects it', async () => {
    renderAssessmentItem(xml());
    const choices = screen.getAllByRole('option');
    await fireEvent.click(choices[0]);
    await fireEvent.click(choices[0]);
    expectNotSelected(choices[0]);
  });

  it.each([
    ['Enter', 'Enter'],
    ['Space', ' '],
  ])('%s key toggles selection', async (_label, key) => {
    renderAssessmentItem(xml());
    const choices = screen.getAllByRole('option');

    await fireEvent.keyDown(choices[0], { key });
    expect(choices[0]).toHaveAttribute('aria-selected', 'true');

    await fireEvent.keyDown(choices[0], { key });
    expectNotSelected(choices[0]);
  });

  it('round-trips answer state', async () => {
    const { checkAnswer, setAnswerState } = renderAssessmentItem(xml());
    const choices = screen.getAllByRole('option');

    await fireEvent.click(choices[0]);
    const result = checkAnswer();
    expect(result.answerState[singleFixture.responseIdentifier]).toBe(firstChoiceId(xml()));

    setAnswerState({});
    await screen.findAllByRole('option');
    expectNotSelected(choices[0]);

    setAnswerState(result.answerState);
    await screen.findAllByRole('option');
    expect(choices[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('restores selection from injected answerState on mount', () => {
    renderAssessmentItem(xml(), {
      answerState: { [singleFixture.responseIdentifier]: firstChoiceId(xml()) },
    });
    const selected = screen
      .getAllByRole('option')
      .filter(c => c.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
  });

  it('reacts to external setAnswerState changes', async () => {
    const { setAnswerState } = renderAssessmentItem(xml());
    setAnswerState({ [singleFixture.responseIdentifier]: firstChoiceId(xml()) });
    await screen.findAllByRole('option');
    const selected = screen
      .getAllByRole('option')
      .filter(c => c.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
  });
});

describe('Multi cardinality', () => {
  const xml = () => items[multiBoundedFixture.id].xml;

  it('exposes aria-multiselectable="true" on the listbox', () => {
    renderAssessmentItem(xml());
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('allows multiple simultaneous selections and individual deselection', async () => {
    renderAssessmentItem(xml());
    const choices = screen.getAllByRole('option');

    await fireEvent.click(choices[0]);
    await fireEvent.click(choices[1]);
    expect(choices[0]).toHaveAttribute('aria-selected', 'true');
    expect(choices[1]).toHaveAttribute('aria-selected', 'true');

    await fireEvent.click(choices[0]);
    expectNotSelected(choices[0]);
    expect(choices[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('enforces maxChoices limit', async () => {
    renderAssessmentItem(xml());
    const choices = screen.getAllByRole('option');
    for (let i = 0; i < multiBoundedFixture.maxChoices; i++) {
      await fireEvent.click(choices[i]);
    }
    if (choices.length > multiBoundedFixture.maxChoices) {
      await fireEvent.click(choices[multiBoundedFixture.maxChoices]);
      expectNotSelected(choices[multiBoundedFixture.maxChoices]);
    }
  });

  it('restores array-valued answerState on mount', () => {
    renderAssessmentItem(xml(), {
      answerState: {
        [multiBoundedFixture.responseIdentifier]: [firstChoiceId(xml())],
      },
    });
    const selected = screen
      .getAllByRole('option')
      .filter(c => c.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
  });
});

describe('Multi-interaction items', () => {
  it('render one listbox per interaction', () => {
    renderAssessmentItem(items[multiInteractionFixture.id].xml);
    expect(screen.getAllByRole('listbox')).toHaveLength(multiInteractionFixture.listboxCount);
  });
});

describe('Shuffle', () => {
  it('renders choices in deterministic seeded order that differs from source order', () => {
    renderAssessmentItem(items[shuffleFixture.id].xml, {
      candidateIdentifier: 'shuffle-seed-001',
    });
    const renderedOrder = screen
      .getAllByRole('option')
      .map(el => identifyShuffleChoice(el.textContent));
    expect(renderedOrder).toEqual(shuffleFixture.expectedShuffledOrder);
    expect(renderedOrder).not.toEqual(shuffleFixture.sourceOrder);
  });
});

describe('Answer guide', () => {
  it('shows the single-selection prompt for a single-selection interaction', () => {
    renderAssessmentItem(items[singleFixture.id].xml);
    expect(
      screen.getByText(answerGuideStrings.chooseOne$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });

  it('shows different copy for a multi-selection interaction', () => {
    renderAssessmentItem(items[multiBoundedFixture.id].xml);
    expect(screen.queryByText(answerGuideStrings.chooseOne$())).not.toBeInTheDocument();
    expect(
      screen.getByText(answerGuideStrings.chooseAny$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });

  it('renders the prompt before the choice list, not after', () => {
    renderAssessmentItem(items[singleFixture.id].xml);
    const prompt = screen.getByText(answerGuideStrings.chooseOne$());
    const listbox = screen.getByRole('listbox');
    expect(prompt.compareDocumentPosition(listbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
