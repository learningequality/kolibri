import { screen, within } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { gapMatchStrings } from '../GapMatchInteraction.vue';

const { responsePoolLabel$, gapEmpty$, gapFilled$ } = gapMatchStrings;

// Choice content comes from the fixture XML rather than a translation, so it is
// matched on the rendered chip instead of through a *ByText query.
function poolChips(container) {
  return Array.from(
    container.querySelectorAll('.qti-gap-match-pool-entry .qti-gap-match-chip'),
  ).map(chip => chip.textContent.trim());
}

function gaps(container) {
  return Array.from(container.querySelectorAll('.qti-gap'));
}

describe('Smoke', () => {
  it('renders the prompt', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(container).toHaveTextContent(
      /Identify the missing words in this famous quote from Shakespeare's Richard III/,
    );
  });

  it('renders the gap match guide', () => {
    renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(
      screen.getByText(answerGuideStrings.gapMatch$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });

  it('puts the gap choices in the pool', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(poolChips(container).sort()).toEqual(['autumn', 'spring', 'summer', 'winter']);
  });

  it('labels the pool', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(within(container).getByLabelText(responsePoolLabel$())).toBeVisible();
  });

  it('renders a gap for each qti-gap in the passage', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(gaps(container)).toHaveLength(2);
  });

  it('keeps the passage around the gaps intact', () => {
    // The item body is parsed as XML, where <qti-gap/> is self-closing. Read
    // back by the HTML parser that is a start tag with no end, which would
    // swallow the rest of the quotation into the first gap.
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(container).toHaveTextContent(/Now is the/);
    expect(container).toHaveTextContent(/of our discontent/);
    expect(container).toHaveTextContent(/In the deep bosom of the ocean buried/);
  });

  it('numbers each gap for a screen reader', () => {
    renderAssessmentItem(items['gap-match-example-1'].xml);
    expect(screen.getByLabelText(gapEmpty$({ number: 1, total: 2 }))).toBeVisible();
    expect(screen.getByLabelText(gapEmpty$({ number: 2, total: 2 }))).toBeVisible();
  });
});

describe('Gaps in authored content', () => {
  it('finds gaps nested in a table', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-2'].xml);
    expect(gaps(container)).toHaveLength(8);
  });

  it('finds gaps inline in a paragraph', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-3'].xml);
    expect(gaps(container)).toHaveLength(4);
  });

  it('keeps its own class when the author puts one on a gap', () => {
    // example-3's last gap carries class="ets-target"
    const { container } = renderAssessmentItem(items['gap-match-example-3'].xml);
    const last = gaps(container)[3];
    expect(last).toHaveClass('qti-gap');
    expect(last).toHaveClass('ets-target');
  });

  it('gives each interaction in an item body only its own gaps', () => {
    // sv-3 holds two interactions, both of which name their gaps G1 and G2
    const { container } = renderAssessmentItem(items['q6-gap-match-interaction-sv-3'].xml);
    const interactions = container.querySelectorAll('.qti-gap-match-interaction');
    expect(interactions).toHaveLength(2);
    interactions.forEach(interaction => {
      expect(interaction.querySelectorAll('.qti-gap')).toHaveLength(2);
    });
  });
});

describe('Restoring an answer', () => {
  it('shows a restored response in its gap', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    const [first] = gaps(container);
    expect(first.textContent.trim()).toBe('winter');
  });

  it('names the filled gap for a screen reader', () => {
    renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    expect(
      screen.getByLabelText(gapFilled$({ number: 1, total: 2, response: 'winter' })),
    ).toBeVisible();
  });

  it('reads a pair as choice first', () => {
    // 'Su G2' is summer in the second gap, not a gap called Su
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['Su', 'G2']] },
    });
    expect(gaps(container)[1].textContent.trim()).toBe('summer');
  });

  it('spends the use of a restored response', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    const chip = Array.from(
      container.querySelectorAll('.qti-gap-match-pool-entry .qti-gap-match-chip'),
    ).find(candidate => candidate.textContent.trim() === 'winter');
    expect(chip).toHaveClass('qti-gap-match-chip-exhausted');
  });

  it('keeps an unlimited response available once used', () => {
    // gap-match-example-3's choices are all match-max="0"
    const { container } = renderAssessmentItem(items['gap-match-example-3'].xml, {
      answerState: { RESPONSE: [['s1', 't1']] },
    });
    const chip = Array.from(
      container.querySelectorAll('.qti-gap-match-pool-entry .qti-gap-match-chip'),
    ).find(candidate => candidate.textContent.trim() === 'Earth');
    expect(chip).not.toHaveClass('qti-gap-match-chip-exhausted');
  });
});

describe('Response variable', () => {
  it('reports a restored answer back choice first', () => {
    const { checkAnswer } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    expect(checkAnswer().answerState.RESPONSE).toEqual([['W', 'G1']]);
  });

  it('ignores a pair naming a gap that is not in the passage', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'nope']] },
    });
    expect(gaps(container).map(gap => gap.textContent.trim())).toEqual(['', '']);
  });

  it('ignores a pair written the wrong way round', () => {
    // Gap first rather than choice first: 'G1' is not a choice, so nothing fills
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['G1', 'W']] },
    });
    expect(gaps(container).map(gap => gap.textContent.trim())).toEqual(['', '']);
  });
});
