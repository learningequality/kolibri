import { screen, waitFor, within } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { associateStrings } from '../AssociateInteraction.vue';

const { responsePoolLabel$, firstSlotEmpty$, secondSlotEmpty$, firstSlotFilled$ } =
  associateStrings;

// Container-scoped: the fixtures shuffle, so pool order is seeded and only
// membership is stable. Tests that care about order say so explicitly.
function poolEntries(container) {
  return within(within(container).getByLabelText(responsePoolLabel$()))
    .getAllByRole('listitem')
    .map(entry => entry.textContent.trim());
}

function slots(container) {
  return Array.from(container.querySelectorAll('.qti-associate-slot'));
}

describe('Smoke', () => {
  it('renders the prompt', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    expect(container).toHaveTextContent(/Match each country to its capital city\./);
  });

  it('renders the associate answer guide', () => {
    renderAssessmentItem(items['associate-interaction-1'].xml);
    expect(
      screen.getByText(answerGuideStrings.associate$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });

  it('puts every response in the pool', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    expect(poolEntries(container).sort()).toEqual([
      'Berlin',
      'France',
      'Germany',
      'Japan',
      'Paris',
      'Tokyo',
    ]);
  });

  it('renders images as response content', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-images'].xml);
    expect(container.querySelectorAll('.qti-associate-chip img')).toHaveLength(3);
  });
});

describe('Pair rows', () => {
  it('renders one row of two slots per association', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    // max-associations="3"
    expect(container.querySelectorAll('.qti-associate-row')).toHaveLength(3);
    expect(slots(container)).toHaveLength(6);
  });

  it('renders every slot empty before the learner answers', () => {
    renderAssessmentItem(items['associate-interaction-1'].xml);
    [1, 2, 3].forEach(number => {
      expect(screen.getByLabelText(firstSlotEmpty$({ number }))).toBeVisible();
      expect(screen.getByLabelText(secondSlotEmpty$({ number }))).toBeVisible();
    });
  });
});

describe('Restoring an answer', () => {
  it('fills slots from injected answerState and takes those responses out of the pool', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: {
        RESPONSE: [
          ['C1', 'C4'],
          ['C2', 'C5'],
        ],
      },
    });

    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
    ).toBeVisible();
    expect(poolEntries(container).sort()).toEqual(['Japan', 'Tokyo']);
  });

  it('re-renders when the answer state changes', async () => {
    const { container, setAnswerState } = renderAssessmentItem(
      items['associate-interaction-1'].xml,
    );
    expect(poolEntries(container)).toHaveLength(6);

    setAnswerState({ RESPONSE: [['C3', 'C6']] });

    await waitFor(() => {
      expect(poolEntries(container).sort()).toEqual(['Berlin', 'France', 'Germany', 'Paris']);
    });
  });
});

describe('Shuffle', () => {
  it('presents the pool in a different order per candidate', () => {
    const a = renderAssessmentItem(items['associate-interaction-1'].xml, {
      candidateIdentifier: 'candidate-a',
    });
    const b = renderAssessmentItem(items['associate-interaction-1'].xml, {
      candidateIdentifier: 'candidate-b',
    });

    expect(poolEntries(a.container)).not.toEqual(poolEntries(b.container));
  });

  it('keeps a fixed response in its authored position', () => {
    // NILE is fixed="true" and authored first, so it leads the pool whatever
    // the seed does to the rest.
    const { container } = renderAssessmentItem(items['associate-interaction-fixed'].xml, {
      candidateIdentifier: 'candidate-a',
    });
    expect(poolEntries(container)[0]).toBe('Nile');
  });
});

describe('Review mode', () => {
  it('marks the interaction read-only', async () => {
    const { container, setInteractive } = renderAssessmentItem(
      items['associate-interaction-1'].xml,
    );
    setInteractive(false);

    await waitFor(() => {
      expect(container.querySelector('.qti-associate-readonly')).toBeInTheDocument();
    });
  });
});
