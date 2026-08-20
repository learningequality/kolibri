import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { slotListboxStrings } from '../../../composables/useSlotListbox';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { gapMatchStrings } from '../GapMatchInteraction.vue';

const { responsePoolLabel$, gapEmpty$, gapFilled$ } = gapMatchStrings;
const { emptyOption$ } = slotListboxStrings;

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

function poolChip(container, text) {
  return Array.from(
    container.querySelectorAll('.qti-gap-match-pool-entry .qti-gap-match-chip'),
  ).find(chip => chip.textContent.trim() === text);
}

// A gap owns a visually hidden option list for its listbox, so what it holds is
// read off the chip rather than the gap's own text.
function gapText(gap) {
  const chip = gap.querySelector('.qti-gap-match-chip');
  return chip ? chip.textContent.trim() : '';
}

const gapTexts = container => gaps(container).map(gapText);

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
    expect(gapText(first)).toBe('winter');
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
    expect(gapText(gaps(container)[1])).toBe('summer');
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
    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('ignores a pair written the wrong way round', () => {
    // Gap first rather than choice first: 'G1' is not a choice, so nothing fills
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['G1', 'W']] },
    });
    expect(gapTexts(container)).toEqual(['', '']);
  });
});

describe('Placing by click', () => {
  it('puts a chosen response in the gap chosen next', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['winter', '']);
  });

  it('takes the response the other way round too', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(gaps(container)[1]);
    await fireEvent.click(poolChip(container, 'summer'));

    expect(gapTexts(container)).toEqual(['', 'summer']);
  });

  it('marks the chosen response as selected', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'winter'));

    expect(poolChip(container, 'winter')).toHaveClass('qti-gap-match-chip-selected');
  });

  it('unselects a response chosen twice', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(poolChip(container, 'winter'));

    expect(poolChip(container, 'winter')).not.toHaveClass('qti-gap-match-chip-selected');
  });

  it('marks a gap awaiting a response as active', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(gaps(container)[0]);

    expect(gaps(container)[0]).toHaveClass('qti-gap-active');
  });

  it('offers the responses that could fill the active gap', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(gaps(container)[0]);

    expect(poolChip(container, 'winter')).toHaveClass('qti-gap-match-chip-candidate');
  });

  it('stops waiting when the active gap is chosen again', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(gaps(container)[0]);
    await fireEvent.click(gaps(container)[0]);

    expect(gaps(container)[0]).not.toHaveClass('qti-gap-active');
  });

  it('takes a response back out of a filled gap', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('returns a response to the pool when its gap is emptied', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    expect(poolChip(container, 'winter')).toHaveClass('qti-gap-match-chip-exhausted');

    await fireEvent.click(gaps(container)[0]);

    expect(poolChip(container, 'winter')).not.toHaveClass('qti-gap-match-chip-exhausted');
  });

  it('replaces what a filled gap holds when a response is carried to it', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await fireEvent.click(poolChip(container, 'summer'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['summer', '']);
  });

  it('does not pick up a response that has no use left', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await fireEvent.click(poolChip(container, 'winter'));

    // Selecting it would leave the learner carrying something no gap can take
    expect(poolChip(container, 'winter')).not.toHaveClass('qti-gap-match-chip-selected');
  });

  it('refuses a response that has no use left', async () => {
    // Every choice in example-1 is match-max="1"
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(gaps(container)[1]);

    expect(gapTexts(container)).toEqual(['winter', '']);
  });

  it('lets an unlimited response fill more than one gap', async () => {
    // gap-match-example-3's choices are all match-max="0"
    const { container } = renderAssessmentItem(items['gap-match-example-3'].xml);

    await fireEvent.click(poolChip(container, 'Earth'));
    await fireEvent.click(gaps(container)[0]);
    await fireEvent.click(poolChip(container, 'Earth'));
    await fireEvent.click(gaps(container)[1]);

    expect(gapTexts(container).slice(0, 2)).toEqual(['Earth', 'Earth']);
  });

  it('refuses a placement past max-associations', async () => {
    // sv-3's second interaction declares no max-associations, so QTI's default
    // of 1 applies
    const { container } = renderAssessmentItem(items['q6-gap-match-interaction-sv-3'].xml);
    const second = container.querySelectorAll('.qti-gap-match-interaction')[1];

    await fireEvent.click(poolChip(second, 'winter'));
    await fireEvent.click(gaps(second)[0]);
    await fireEvent.click(poolChip(second, 'summer'));
    await fireEvent.click(gaps(second)[1]);

    expect(gapTexts(second)).toEqual(['winter', '']);
  });
});

describe('Review mode', () => {
  it('does not place anything', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      interactive: false,
    });

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('still shows the answer that was given', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      interactive: false,
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    expect(gapTexts(container)).toEqual(['winter', '']);
  });

  it('does not empty a filled gap', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      interactive: false,
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['winter', '']);
  });
});

describe('Response variable', () => {
  it('reports each pairing choice first', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(gaps(container)[0]);

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([['W', 'G1']]);
    });
  });

  it('scores through the mapping when the answer is correct', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(gaps(container)[0]);
    await fireEvent.click(poolChip(container, 'summer'));
    await fireEvent.click(gaps(container)[1]);

    // 1 + 2 from the fixture's qti-mapping, whose keys are 'W G1' and 'Su G2'.
    // A transposition would miss every map key and score the -1 default, so
    // this is the check that the directed pairs come out the right way round.
    await waitFor(() => {
      expect(checkAnswer().outcomes.SCORE).toBe(3);
    });
  });

  it('tells the host the learner has interacted', async () => {
    const { container, interactionFn } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'winter'));
    await fireEvent.click(gaps(container)[0]);

    await waitFor(() => {
      expect(interactionFn).toHaveBeenCalled();
    });
  });
});

// SortableJS cannot be driven in jsdom, so a drag is exercised the way the
// abstraction reports it: handleStart announces the source region, then
// handleEnd inserts into the destination region and emits the source's
// remaining items.
function findRegions() {
  const mounted = Array.from(document.body.querySelectorAll('*')).find(el => el.__vue__);
  const regions = [];
  const walk = vm => {
    if (!vm) {
      return;
    }
    if (vm.$options.name === 'DraggableRegion') {
      regions.push(vm);
    }
    (vm.$children || []).forEach(walk);
  };
  walk(mounted && mounted.__vue__.$root);
  return regions;
}

// A gap's label changes as it fills, so regions are found by the element they
// render rather than by their label.
function regionOfEl(el) {
  return findRegions().find(region => region.$el === el);
}

const gapRegion = (container, index) => regionOfEl(gaps(container)[index]);
const poolRegion = container => regionOfEl(container.querySelector('.qti-gap-match-pool-items'));

async function drag(source, target, identifier) {
  const sourceItemsBeforeDrag = source.items;
  source.$emit('dragstart');
  target.$emit('update:items', [...target.items, { identifier }]);
  source.$emit(
    'update:items',
    sourceItemsBeforeDrag.filter(item => item.identifier !== identifier),
  );
  await target.$nextTick();
}

describe('Placing by drag', () => {
  it('fills a gap dragged onto from the pool', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await drag(poolRegion(container), gapRegion(container, 0), 'W');

    expect(gapTexts(container)).toEqual(['winter', '']);
  });

  it('leaves out a response with no uses left', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    // An exhausted chip is still shown, but it is not something to pick up
    expect(poolRegion(container).items.map(item => item.identifier)).not.toContain('W');
  });

  it('empties the gap a response is dragged out of', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await drag(gapRegion(container, 0), poolRegion(container), 'W');

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('moves a response from one gap to another', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-3'].xml, {
      answerState: { RESPONSE: [['s1', 't1']] },
    });

    await drag(gapRegion(container, 0), gapRegion(container, 1), 's1');

    expect(gapTexts(container).slice(0, 2)).toEqual(['', 'Earth']);
  });

  it('moves a response on its last use to another gap', async () => {
    // Every choice in example-1 is match-max="1", so the destination can only
    // take it once the origin has given it up
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await drag(gapRegion(container, 0), gapRegion(container, 1), 'W');

    expect(gapTexts(container)).toEqual(['', 'winter']);
  });

  it('replaces what a filled gap holds', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    await drag(poolRegion(container), gapRegion(container, 0), 'Su');

    expect(gapTexts(container)).toEqual(['summer', '']);
  });

  it('reports a dragged placement on the response variable', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await drag(poolRegion(container), gapRegion(container, 0), 'W');

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([['W', 'G1']]);
    });
  });

  it('disables every region in review mode', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      interactive: false,
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    expect(poolRegion(container).disabled).toBe(true);
    expect(gapRegion(container, 0).disabled).toBe(true);
  });

  it('places nothing dropped in review mode', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      interactive: false,
    });

    await drag(poolRegion(container), gapRegion(container, 0), 'W');

    expect(gapTexts(container)).toEqual(['', '']);
  });
});

describe('Keyboard', () => {
  function optionsOf(gap) {
    return Array.from(gap.querySelectorAll('[role="option"]')).map(option => ({
      text: option.textContent.trim(),
      selected: option.getAttribute('aria-selected'),
    }));
  }

  // The responses alone, without the empty option that leads them
  const responsesOf = gap => optionsOf(gap).slice(1);

  function activeOptionText(gap) {
    const id = gap.getAttribute('aria-activedescendant');
    return gap.querySelector(`#${id}`).textContent.trim();
  }

  it('exposes every gap as a listbox that tab can reach', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    gaps(container).forEach(gap => {
      expect(gap).toHaveAttribute('role', 'listbox');
      expect(gap).toHaveAttribute('tabindex', '0');
    });
  });

  it('keeps the response pool out of the tab order', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    const pool = container.querySelector('.qti-gap-match-pool');

    expect(pool.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
  });

  it('leads the options with an empty one, so an answer can be taken back out', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    expect(optionsOf(gaps(container)[0])[0].text).toBe(emptyOption$());
  });

  it('offers every response a gap could take', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    expect(responsesOf(gaps(container)[0]).map(option => option.text)).toEqual([
      'winter',
      'spring',
      'summer',
      'autumn',
    ]);
  });

  it('leaves out a response that has no use left', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    // W is match-max="1" and spent, so the other gap cannot take it
    expect(responsesOf(gaps(container)[1]).map(option => option.text)).toEqual([
      'spring',
      'summer',
      'autumn',
    ]);
  });

  it("keeps a gap's own response among its options", () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });

    const options = optionsOf(gaps(container)[0]);
    expect(options.map(option => option.text)).toContain('winter');
    expect(options.filter(option => option.selected === 'true')).toHaveLength(1);
  });

  it('answers a gap when it is tabbed to', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.focus(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['winter', '']);
  });

  it('does not answer a gap a pointer press moved focus to', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    const gap = gaps(container)[0];

    await fireEvent.mouseDown(gap);
    await fireEvent.focus(gap);

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('puts down a carried response when the keyboard takes over', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'spring'));
    await fireEvent.focus(gaps(container)[0]);

    // The gap answers itself on focus, so a response still held from a pointer
    // click would leave the learner carrying something they never placed
    expect(poolChip(container, 'spring')).not.toHaveClass('qti-gap-match-chip-selected');
  });

  it('steps to the next response with the down arrow', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    const gap = gaps(container)[0];

    await fireEvent.focus(gap);
    await fireEvent.keyDown(gap, { key: 'ArrowDown' });

    expect(gapTexts(container)).toEqual(['spring', '']);
  });

  it('steps back to the empty option with the up arrow', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    const gap = gaps(container)[0];

    await fireEvent.focus(gap);
    await fireEvent.keyDown(gap, { key: 'ArrowUp' });

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('jumps to the last response with End', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    const gap = gaps(container)[0];

    await fireEvent.focus(gap);
    await fireEvent.keyDown(gap, { key: 'End' });

    expect(gapTexts(container)).toEqual(['autumn', '']);
  });

  it('empties the gap with Escape', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    const gap = gaps(container)[0];

    await fireEvent.keyDown(gap, { key: 'Escape' });

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('names the option a gap is resting on', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);
    const gap = gaps(container)[0];

    await fireEvent.focus(gap);

    expect(activeOptionText(gaps(container)[0])).toBe('winter');
  });

  it('fills nothing on focus once max-associations is reached', async () => {
    // sv-3's second interaction takes QTI's default of one association
    const { container } = renderAssessmentItem(items['q6-gap-match-interaction-sv-3'].xml);
    const second = container.querySelectorAll('.qti-gap-match-interaction')[1];

    await fireEvent.focus(gaps(second)[0]);
    await fireEvent.focus(gaps(second)[1]);

    // Tabbing through must not raise a refusal on every gap it passes
    expect(gapTexts(second)).toEqual(['winter', '']);
  });

  it('is not a listbox in review mode', () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      interactive: false,
    });

    gaps(container).forEach(gap => {
      expect(gap).not.toHaveAttribute('role');
      expect(gap).not.toHaveAttribute('tabindex');
    });
  });
});

// The second mode from the design board: a gap is fed by the responses its
// match-group admits rather than by the whole pool. The fixture groups by word
// class, so each group spans several gaps — a group that mapped onto one gap
// would make the highlight itself an answer key.
describe('Answer-specific distractor pools', () => {
  const FIXTURE = 'gap-match-distractor-pools';

  function optionTexts(gap) {
    return Array.from(gap.querySelectorAll('[role="option"]'))
      .map(option => option.textContent.trim())
      .slice(1);
  }

  it('offers a gap only the responses grouped to it', () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    expect(optionTexts(gaps(container)[0])).toEqual(['sat', 'slept', 'barked', 'ran', 'jumped']);
  });

  it("keeps another group's responses out", () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    expect(optionTexts(gaps(container)[1])).toEqual(['mat', 'door', 'tree', 'roof']);
  });

  it('offers the same group to every gap that shares it', () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    // G1, G3 and G4 all take a verb; G2 and G5 both take a noun
    expect(optionTexts(gaps(container)[2])).toEqual(optionTexts(gaps(container)[0]));
    expect(optionTexts(gaps(container)[3])).toEqual(optionTexts(gaps(container)[0]));
    expect(optionTexts(gaps(container)[4])).toEqual(optionTexts(gaps(container)[1]));
  });

  it('highlights every gap a chosen response could go in', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(poolChip(container, 'sat'));

    // Every verb slot, so choosing a response never says which gap it answers
    expect(gaps(container)[0]).toHaveClass('qti-gap-target');
    expect(gaps(container)[2]).toHaveClass('qti-gap-target');
    expect(gaps(container)[3]).toHaveClass('qti-gap-target');
    expect(gaps(container)[1]).not.toHaveClass('qti-gap-target');
    expect(gaps(container)[4]).not.toHaveClass('qti-gap-target');
  });

  it('leaves a gap that is already filled out of the highlight', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml, {
      answerState: { RESPONSE: [['sat', 'G1']] },
    });

    await fireEvent.click(poolChip(container, 'ran'));

    // G1 holds a response already, so it is not somewhere free to put this one
    expect(gaps(container)[0]).not.toHaveClass('qti-gap-target');
    expect(gaps(container)[2]).toHaveClass('qti-gap-target');
    expect(gaps(container)[3]).toHaveClass('qti-gap-target');
  });

  it('still lets a filled gap be replaced, unhighlighted', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml, {
      answerState: { RESPONSE: [['sat', 'G1']] },
    });

    await fireEvent.click(poolChip(container, 'ran'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['ran', '', '', '', '']);
  });

  it('highlights only the responses the chosen gap would take', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(gaps(container)[0]);

    expect(poolChip(container, 'sat')).toHaveClass('qti-gap-match-chip-candidate');
    expect(poolChip(container, 'ran')).toHaveClass('qti-gap-match-chip-candidate');
    expect(poolChip(container, 'mat')).not.toHaveClass('qti-gap-match-chip-candidate');
  });

  it('refuses a response carried to a gap that excludes it', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(poolChip(container, 'mat'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['', '', '', '', '']);
  });

  it('refuses a gap chosen first and then an excluded response', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(gaps(container)[0]);
    await fireEvent.click(poolChip(container, 'mat'));

    expect(gapTexts(container)).toEqual(['', '', '', '', '']);
  });

  it('still takes a response the gap admits', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(poolChip(container, 'sat'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['sat', '', '', '', '']);
  });

  it('takes a response in any gap of its group', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(poolChip(container, 'barked'));
    await fireEvent.click(gaps(container)[3]);

    expect(gapTexts(container)).toEqual(['', '', '', 'barked', '']);
  });

  it('lets one sentence take two responses from the same group', async () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    await fireEvent.click(poolChip(container, 'sat'));
    await fireEvent.click(gaps(container)[0]);
    await fireEvent.click(poolChip(container, 'ran'));
    await fireEvent.click(gaps(container)[2]);

    expect(gapTexts(container)).toEqual(['sat', '', 'ran', '', '']);
  });

  it('refuses a drop from an excluded response', () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml);

    expect(gapRegion(container, 0).accepts({ identifier: 'mat' })).toBe(false);
    expect(gapRegion(container, 0).accepts({ identifier: 'sat' })).toBe(true);
    expect(gapRegion(container, 2).accepts({ identifier: 'sat' })).toBe(true);
    expect(gapRegion(container, 3).accepts({ identifier: 'sat' })).toBe(true);
    expect(gapRegion(container, 1).accepts({ identifier: 'mat' })).toBe(true);
    expect(gapRegion(container, 4).accepts({ identifier: 'mat' })).toBe(true);
  });

  it('ignores an excluded pair restored from an answer', () => {
    const { container } = renderAssessmentItem(items[FIXTURE].xml, {
      answerState: { RESPONSE: [['mat', 'G1']] },
    });

    expect(gapTexts(container)).toEqual(['', '', '', '', '']);
  });

  it('scores through the mapping when each gap takes its own answer', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items[FIXTURE].xml);

    const answers = [
      ['sat', 0],
      ['mat', 1],
      ['ran', 2],
      ['barked', 3],
      ['door', 4],
    ];
    for (const [text, index] of answers) {
      await fireEvent.click(poolChip(container, text));
      await fireEvent.click(gaps(container)[index]);
    }

    await waitFor(() => {
      expect(checkAnswer().outcomes.SCORE).toBe(5);
    });
  });
});

// The rule is symmetric, and an author can write it from either end. The
// fixture above has each choice name the gaps it belongs to; this names the
// same relationship the other way round, from the gaps.
const GAP_SIDE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="gap-side-groups" title="Gap-side groups"
  adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair"/>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-gap-match-interaction max-associations="0" response-identifier="RESPONSE">
      <qti-gap-text identifier="red" match-max="1">red</qti-gap-text>
      <qti-gap-text identifier="green" match-max="1">green</qti-gap-text>
      <qti-gap-text identifier="blue" match-max="1">blue</qti-gap-text>
      <qti-gap-text identifier="one" match-max="1">one</qti-gap-text>
      <qti-gap-text identifier="two" match-max="1">two</qti-gap-text>
      <qti-gap-text identifier="three" match-max="1">three</qti-gap-text>
      <p>A colour: <qti-gap identifier="C" match-group="red green blue"/>.</p>
      <p>A number: <qti-gap identifier="N" match-group="one two three"/>.</p>
    </qti-gap-match-interaction>
  </qti-item-body>
</qti-assessment-item>`;

describe('Groups named by the gap', () => {
  function optionTexts(gap) {
    return Array.from(gap.querySelectorAll('[role="option"]'))
      .map(option => option.textContent.trim())
      .slice(1);
  }

  it('offers a gap only the responses it names', () => {
    const { container } = renderAssessmentItem(GAP_SIDE_XML);

    expect(optionTexts(gaps(container)[0])).toEqual(['red', 'green', 'blue']);
    expect(optionTexts(gaps(container)[1])).toEqual(['one', 'two', 'three']);
  });

  it('refuses a response it does not name', async () => {
    const { container } = renderAssessmentItem(GAP_SIDE_XML);

    await fireEvent.click(poolChip(container, 'one'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['', '']);
  });

  it('takes a response it does name', async () => {
    const { container } = renderAssessmentItem(GAP_SIDE_XML);

    await fireEvent.click(poolChip(container, 'green'));
    await fireEvent.click(gaps(container)[0]);

    expect(gapTexts(container)).toEqual(['green', '']);
  });
});

describe('Refusing a drag', () => {
  // Each interaction provides its own drag universe, so an item body holding
  // two has two of them and the one under test has to be named. A drag in
  // flight is simulated by putting that universe into the state handleStart
  // would, since SortableJS itself cannot be driven in jsdom.
  function draggableUniverse(scope) {
    let vm = findRegions().find(region => !scope || scope.contains(region.$el));
    while (vm) {
      const provided = vm._provided || {};
      const found = Object.getOwnPropertySymbols(provided)
        .map(symbol => provided[symbol])
        .find(value => value && value.isDragging && value.draggedItem);
      if (found) {
        return found;
      }
      vm = vm.$parent;
    }
    return null;
  }

  async function carry(container, identifier, scope) {
    const universe = draggableUniverse(scope);
    universe.isDragging.value = true;
    universe.draggedItem.value = { identifier };
    await poolRegion(container).$nextTick();
  }

  it('marks every gap that would take what is being carried', async () => {
    const { container } = renderAssessmentItem(items['gap-match-distractor-pools'].xml);

    await carry(container, 'sat');

    expect(gaps(container)[0]).toHaveClass('qti-gap-target');
    expect(gaps(container)[2]).toHaveClass('qti-gap-target');
    expect(gaps(container)[3]).toHaveClass('qti-gap-target');
  });

  it('does not mark a gap that is already filled', async () => {
    const { container } = renderAssessmentItem(items['gap-match-distractor-pools'].xml, {
      answerState: { RESPONSE: [['sat', 'G1']] },
    });

    await carry(container, 'ran');

    expect(gaps(container)[0]).not.toHaveClass('qti-gap-target');
    expect(gaps(container)[2]).toHaveClass('qti-gap-target');
  });

  it('marks the gaps that would refuse it', async () => {
    const { container } = renderAssessmentItem(items['gap-match-distractor-pools'].xml);

    await carry(container, 'sat');

    expect(gaps(container)[1]).toHaveClass('qti-gap-refusing');
    expect(gaps(container)[4]).toHaveClass('qti-gap-refusing');
  });

  it('tells a screen reader a refusing gap is unavailable', async () => {
    const { container } = renderAssessmentItem(items['gap-match-distractor-pools'].xml);

    await carry(container, 'sat');

    expect(gaps(container)[1]).toHaveAttribute('aria-disabled', 'true');
    expect(gaps(container)[0]).not.toHaveAttribute('aria-disabled');
  });

  it('marks every gap for a response with no group of its own', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await carry(container, 'W');

    gaps(container).forEach(gap => expect(gap).toHaveClass('qti-gap-target'));
  });

  it('marks nothing refusing in an item body with no match-group at all', async () => {
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml);

    await carry(container, 'W');

    gaps(container).forEach(gap => expect(gap).not.toHaveClass('qti-gap-refusing'));
  });

  it('marks the gap a response is being carried out of as a place to put it back', async () => {
    // W is match-max="1" and already spent on G1, so without discounting the
    // gap it is leaving it would report that there is nowhere left to put it
    const { container } = renderAssessmentItem(items['gap-match-example-1'].xml, {
      answerState: { RESPONSE: [['W', 'G1']] },
    });
    const universe = draggableUniverse();
    universe.isDragging.value = true;
    universe.draggedItem.value = { identifier: 'W' };
    gapRegion(container, 0).$emit('dragstart');
    await poolRegion(container).$nextTick();

    expect(gaps(container)[1]).toHaveClass('qti-gap-target');
  });

  it('marks nothing once max-associations is reached', async () => {
    // sv-3's second interaction takes QTI's default of one association
    const { container } = renderAssessmentItem(items['q6-gap-match-interaction-sv-3'].xml, {
      answerState: { RESPONSE1: [], RESPONSE2: [['W', 'G1']] },
    });
    const second = container.querySelectorAll('.qti-gap-match-interaction')[1];

    await carry(container, 'Sp', second);

    // G1 already holds the one association the interaction allows
    expect(gaps(second)[1]).not.toHaveClass('qti-gap-target');
  });
});
