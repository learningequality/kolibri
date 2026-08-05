import { screen, waitFor, within } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { matchStrings } from '../MatchInteraction.vue';

const { responsePoolLabel$, entryEmpty$, entryFilled$, rowLabel$ } = matchStrings;

// Response content comes from the fixture XML rather than a translation, so it
// is matched on the rendered chip instead of through a *ByText query.
function poolChips(container) {
  return Array.from(container.querySelectorAll('.qti-match-pool-entry .qti-match-chip')).map(chip =>
    chip.textContent.trim(),
  );
}

function poolChip(container, text) {
  return Array.from(container.querySelectorAll('.qti-match-pool-entry .qti-match-chip')).find(
    chip => chip.textContent.trim() === text,
  );
}

function sourceLabels(container) {
  return Array.from(container.querySelectorAll('.qti-match-source')).map(source =>
    source.textContent.trim(),
  );
}

function entriesOfRow(container, sourceText) {
  const row = Array.from(container.querySelectorAll('.qti-match-row')).find(
    candidate => candidate.querySelector('.qti-match-source').textContent.trim() === sourceText,
  );
  return Array.from(row.querySelectorAll('.qti-match-entry'));
}

describe('Smoke', () => {
  it('renders the prompt', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(container).toHaveTextContent(
      /Match the following characters to the Shakespeare play they appeared in:/,
    );
  });

  it('renders the shared choose-then-target guide', () => {
    renderAssessmentItem(items['match-example-1'].xml);
    expect(
      screen.getByText(answerGuideStrings.chooseThenTarget$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });

  it('puts the second set in the pool', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(poolChips(container).sort()).toEqual([
      "A Midsummer-Night's Dream",
      'Romeo and Juliet',
      'The Tempest',
    ]);
  });

  it('gives the first set a row each', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(sourceLabels(container).sort()).toEqual([
      'Capulet',
      'Demetrius',
      'Lysander',
      'Prospero',
    ]);
  });

  it('does not put the sources in the pool', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(poolChip(container, 'Capulet')).toBeUndefined();
  });

  it('labels the pool', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(within(container).getByLabelText(responsePoolLabel$())).toBeVisible();
  });
});

describe('Row capacity', () => {
  it('offers one empty entry per row when the source takes a single match', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    // every source has match-max="1"
    expect(entriesOfRow(container, 'Capulet')).toHaveLength(1);
  });

  it('keeps an empty entry available while an unlimited source has room', () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: { RESPONSE: [['r2', 'h1']] },
    });
    // r2 is match-max="0", so it keeps offering another position
    expect(entriesOfRow(container, 'Endothermic')).toHaveLength(2);
  });

  it('labels each row for the source it belongs to', () => {
    renderAssessmentItem(items['match-example-1'].xml);
    expect(screen.getByLabelText(rowLabel$({ source: 'Capulet' }))).toBeVisible();
  });

  it('names an empty entry after its source', () => {
    renderAssessmentItem(items['match-example-1'].xml);
    expect(screen.getByLabelText(entryEmpty$({ source: 'Prospero' }))).toBeVisible();
  });
});

describe('Restoring an answer', () => {
  it('fills rows from injected answerState', () => {
    renderAssessmentItem(items['match-example-1'].xml, {
      answerState: {
        RESPONSE: [
          ['C', 'R'],
          ['P', 'T'],
        ],
      },
    });

    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Capulet', response: 'Romeo and Juliet' }),
      ),
    ).toBeVisible();
    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Prospero', response: 'The Tempest' }),
      ),
    ).toBeVisible();
  });

  it('keeps a reused target available in the pool', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      answerState: {
        RESPONSE: [
          ['D', 'M'],
          ['L', 'M'],
        ],
      },
    });

    // M is match-max="4", so two uses leave it live
    expect(poolChip(container, "A Midsummer-Night's Dream")).not.toHaveClass(
      'qti-match-chip-exhausted',
    );
  });

  it('marks a target spent once its match-max is used up', () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r1', 'h1'],
          ['r2', 'h1'],
        ],
      },
    });

    // h1 is match-max="2"
    expect(poolChip(container, 'Birds')).toHaveClass('qti-match-chip-exhausted');
    expect(poolChip(container, 'Mammals')).not.toHaveClass('qti-match-chip-exhausted');
  });

  it('shows both targets of a row that holds more than one', () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r2', 'h1'],
          ['r2', 'h3'],
        ],
      },
    });

    const filled = entriesOfRow(container, 'Endothermic').filter(entry =>
      entry.classList.contains('qti-match-entry-filled'),
    );
    expect(filled.map(entry => entry.textContent.trim())).toEqual(['Birds', 'Mammals']);
  });

  it('re-renders when the answer state changes', async () => {
    const { setAnswerState } = renderAssessmentItem(items['match-example-1'].xml);

    setAnswerState({ RESPONSE: [['C', 'R']] });

    await waitFor(() => {
      expect(
        screen.getByLabelText(
          entryFilled$({ number: 1, source: 'Capulet', response: 'Romeo and Juliet' }),
        ),
      ).toBeVisible();
    });
  });
});

describe('Shuffle', () => {
  it('leaves both sets in authored order when shuffle is off', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(sourceLabels(container)).toEqual(['Capulet', 'Demetrius', 'Lysander', 'Prospero']);
    expect(poolChips(container)).toEqual([
      "A Midsummer-Night's Dream",
      'Romeo and Juliet',
      'The Tempest',
    ]);
  });
});

describe('Review mode', () => {
  it('marks the interaction read-only', async () => {
    const { container, setInteractive } = renderAssessmentItem(items['match-example-1'].xml);
    setInteractive(false);

    await waitFor(() => {
      expect(container.querySelector('.qti-match-readonly')).toBeInTheDocument();
    });
  });

  it('still shows the restored answer', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      interactive: false,
      answerState: { RESPONSE: [['C', 'R']] },
    });

    expect(within(container).getByLabelText(rowLabel$({ source: 'Capulet' }))).toHaveTextContent(
      'Romeo and Juliet',
    );
  });
});
