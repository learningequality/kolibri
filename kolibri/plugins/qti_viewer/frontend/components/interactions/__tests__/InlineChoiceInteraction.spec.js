import { screen, waitFor } from '@testing-library/vue';
import shuffled from 'kolibri-common/utils/shuffled';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { inlineChoiceStrings } from '../InlineChoiceInteraction.vue';

const smokeFixtures = [
  ['q12-inline-choice-interaction', 1],
  ['shakespeare-biography', 2],
  ['vertical-inlinechoice-16', 1],
];

// tippy-based popovers do not open in jsdom, so the option list is never rendered to
// the DOM. To exercise a learner selecting an option we reach the KDropdownMenu
// instances and replay the `select` event they emit when an option is chosen — the
// same event our component listens to in production.
function findKDropdownMenus() {
  const withVue = Array.from(document.body.querySelectorAll('*')).find(el => el.__vue__);
  const root = withVue && withVue.__vue__.$root;
  const menus = [];
  const walk = vm => {
    if (!vm) {
      return;
    }
    if (vm.$options.name === 'KDropdownMenu') {
      menus.push(vm);
    }
    (vm.$children || []).forEach(walk);
  };
  walk(root);
  return menus;
}

async function selectOption(menuIndex, value) {
  const menu = findKDropdownMenus()[menuIndex];
  const option = menu.options.find(o => o.value === value);
  menu.$emit('select', option);
  await menu.$nextTick();
}

describe('Smoke', () => {
  it.each(smokeFixtures)('%s renders %d inline-choice trigger(s)', (id, gapCount) => {
    renderAssessmentItem(items[id].xml);
    expect(screen.getAllByRole('button')).toHaveLength(gapCount);
  });
});

describe('Unanswered gap', () => {
  const xml = () => items['q12-inline-choice-interaction'].xml;

  it('shows the placeholder in the trigger', () => {
    renderAssessmentItem(xml());
    expect(screen.getByRole('button')).toHaveTextContent(inlineChoiceStrings.placeholder$());
  });

  it('exposes an accessible name describing the not-answered state', () => {
    renderAssessmentItem(xml());
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      inlineChoiceStrings.notAnswered$(),
    );
  });

  it('wires the choice options into the dropdown in document order', () => {
    renderAssessmentItem(xml());
    const [menu] = findKDropdownMenus();
    expect(menu.options).toEqual([
      { label: 'Gloucester', value: 'G' },
      { label: 'Lancaster', value: 'L' },
      { label: 'York', value: 'Y' },
    ]);
  });
});

describe('Selecting an option', () => {
  const xml = () => items['q12-inline-choice-interaction'].xml;

  it('updates the trigger to show the selected choice text', async () => {
    renderAssessmentItem(xml());
    await selectOption(0, 'Y');
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('York');
    expect(button).not.toHaveTextContent(inlineChoiceStrings.placeholder$());
  });

  it('updates the accessible name to reflect the answered state', async () => {
    renderAssessmentItem(xml());
    await selectOption(0, 'Y');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      inlineChoiceStrings.answered$({ selection: 'York' }),
    );
  });

  it('stores the selected identifier in the response, readable via checkAnswer', async () => {
    const { checkAnswer } = renderAssessmentItem(xml());
    await selectOption(0, 'Y');
    expect(checkAnswer().answerState.RESPONSE).toBe('Y');
  });
});

describe('Multiple gaps', () => {
  const xml = () => items['shakespeare-biography'].xml;

  it('render and are answerable independently', async () => {
    renderAssessmentItem(xml());
    // Selecting in the first gap leaves the second gap on its placeholder.
    await selectOption(0, 'choice_1');
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('26 April 1564');
    expect(buttons[1]).toHaveTextContent(inlineChoiceStrings.placeholder$());

    await selectOption(1, 'choice_4');
    expect(buttons[0]).toHaveTextContent('26 April 1564');
    expect(buttons[1]).toHaveTextContent('23 April 1616');
  });
});

describe('Answer state', () => {
  const xml = () => items['q12-inline-choice-interaction'].xml;

  it('restores the selected choice from injected answerState on mount', () => {
    renderAssessmentItem(xml(), { answerState: { RESPONSE: 'Y' } });
    expect(screen.getByRole('button')).toHaveTextContent('York');
  });

  it('reacts to external setAnswerState changes', async () => {
    const { setAnswerState } = renderAssessmentItem(xml());
    setAnswerState({ RESPONSE: 'L' });
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Lancaster'));
  });

  it('round-trips a selection through checkAnswer and setAnswerState', async () => {
    const { checkAnswer, setAnswerState } = renderAssessmentItem(xml());
    await selectOption(0, 'Y');
    const result = checkAnswer();

    setAnswerState({});
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        inlineChoiceStrings.notAnswered$(),
      ),
    );

    setAnswerState(result.answerState);
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('York'));
  });
});

describe('Non-interactive (report) mode', () => {
  const xml = () => items['q12-inline-choice-interaction'].xml;

  it('renders the selected answer as static text without a dropdown trigger', () => {
    const { container } = renderAssessmentItem(xml(), {
      interactive: false,
      answerState: { RESPONSE: 'Y' },
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('.qti-inline-choice-report')).toHaveTextContent('York');
  });
});

describe('Shuffle', () => {
  const candidateIdentifier = 'shuffle-seed-001';
  const sourceIds = ['A', 'B', 'C', 'D'];
  const shuffleXml = `<qti-assessment-item
      xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
      identifier="inline-shuffle" title="Shuffle" adaptive="false" time-dependent="false">
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"/>
      <qti-item-body>
        <p>Pick <qti-inline-choice-interaction response-identifier="RESPONSE" shuffle="true">
          <qti-inline-choice identifier="A">Alpha</qti-inline-choice>
          <qti-inline-choice identifier="B">Bravo</qti-inline-choice>
          <qti-inline-choice identifier="C">Charlie</qti-inline-choice>
          <qti-inline-choice identifier="D" fixed="true">Delta</qti-inline-choice>
        </qti-inline-choice-interaction>.</p>
      </qti-item-body>
    </qti-assessment-item>`;

  it('applies a seeded order that is consistent for a given candidate', () => {
    renderAssessmentItem(shuffleXml, { candidateIdentifier });
    const renderedIds = findKDropdownMenus()[0].options.map(o => o.value);

    // Deterministic: the same candidate seed reproduces the same order.
    const shuffleable = shuffled(['A', 'B', 'C'], candidateIdentifier);
    const expected = ['A', 'B', 'C', 'D'].map(id => (id === 'D' ? 'D' : shuffleable.shift()));
    expect(renderedIds).toEqual(expected);

    // The shuffle actually reorders relative to source (guards against a no-op).
    expect(renderedIds).not.toEqual(sourceIds);
  });

  it('keeps fixed choices in their original position', () => {
    renderAssessmentItem(shuffleXml, { candidateIdentifier });
    const renderedIds = findKDropdownMenus()[0].options.map(o => o.value);
    // 'D' is fixed at the last position.
    expect(renderedIds[renderedIds.length - 1]).toBe('D');
  });
});
