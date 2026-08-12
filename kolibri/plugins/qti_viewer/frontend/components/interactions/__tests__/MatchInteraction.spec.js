import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { matchStrings } from '../MatchInteraction.vue';

const { responsePoolLabel$, entryEmpty$, entryFilled$, rowLabel$, refusedAlreadyInRow$ } =
  matchStrings;

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

// The whole answer field is the drop area, so it is what highlights
function fieldOfRow(container, sourceText) {
  const row = Array.from(container.querySelectorAll('.qti-match-row')).find(
    candidate => candidate.querySelector('.qti-match-source').textContent.trim() === sourceText,
  );
  return row.querySelector('.qti-match-field');
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
    // the visible chip, not the entry, which also carries the hidden listbox options
    expect(filled.map(entry => entry.querySelector('.qti-match-chip').textContent.trim())).toEqual([
      'Birds',
      'Mammals',
    ]);
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

// SortableJS cannot be driven in jsdom, so a drag is exercised the way the
// abstraction reports it: useDraggableRegion's handleEnd inserts into the
// destination region first, then emits the source region's remaining items.
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

function regionLabelled(label) {
  return findRegions().find(region => region.label === label);
}

async function dragInto(targetLabel, identifier, sourceLabel) {
  const source = regionLabelled(sourceLabel);
  const target = regionLabelled(targetLabel);
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
  const poolLabel = () => responsePoolLabel$();
  const rowFor = source => rowLabel$({ source });

  it('adds a target dragged from the pool onto a row', async () => {
    renderAssessmentItem(items['match-example-1'].xml);

    await dragInto(rowFor('Capulet'), 'R', poolLabel());

    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Capulet', response: 'Romeo and Juliet' }),
      ),
    ).toBeVisible();
  });

  it('leaves the target in the pool, since it has uses left', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);

    await dragInto(rowFor('Capulet'), 'M', poolLabel());

    expect(poolChip(container, "A Midsummer-Night's Dream")).not.toHaveClass(
      'qti-match-chip-exhausted',
    );
  });

  it('moves a target between rows without losing it on the way', async () => {
    // h1 has match-max="2" and is already at its limit, so the move only works
    // if the origin's use is freed before the destination checks for room
    renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r1', 'h1'],
          ['r2', 'h1'],
        ],
      },
    });

    await dragInto(rowFor('Possess Gills'), 'h1', rowFor('Asexual'));

    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Possess Gills', response: 'Birds' }),
      ),
    ).toBeVisible();
    expect(screen.getByLabelText(entryEmpty$({ source: 'Asexual' }))).toBeVisible();
  });

  it('takes the pairing out when a target is dragged back to the pool', async () => {
    renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    await dragInto(poolLabel(), 'R', rowFor('Capulet'));

    expect(screen.getByLabelText(entryEmpty$({ source: 'Capulet' }))).toBeVisible();
  });

  it('replaces the pairing when dropped onto a row with no room', async () => {
    renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    // Capulet is match-max="1": the drop has nowhere to be added, so rather
    // than springing back it takes the place of what is already there
    await dragInto(rowFor('Capulet'), 'T', poolLabel());

    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Capulet', response: 'The Tempest' }),
      ),
    ).toBeVisible();
  });

  it('updates the response variable after a drag', async () => {
    const { checkAnswer } = renderAssessmentItem(items['match-example-1'].xml);

    await dragInto(rowFor('Prospero'), 'T', poolLabel());

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([['P', 'T']]);
    });
  });

  it('leaves an exhausted target out of the pool region items', () => {
    renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r1', 'h1'],
          ['r2', 'h1'],
        ],
      },
    });

    const identifiers = regionLabelled(responsePoolLabel$()).items.map(item => item.identifier);
    expect(identifiers).not.toContain('h1');
    expect(identifiers).toContain('h2');
  });

  it('disables the regions in review mode', () => {
    renderAssessmentItem(items['match-example-1'].xml, { interactive: false });

    expect(findRegions().every(region => region.disabled)).toBe(true);
  });
});

describe('Placing by click', () => {
  it('places a selected response into the entry clicked next', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'Romeo and Juliet'));
    await fireEvent.click(entriesOfRow(container, 'Capulet')[0]);

    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Capulet', response: 'Romeo and Juliet' }),
      ),
    ).toBeVisible();
  });

  it('places into an entry chosen before the response', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);

    await fireEvent.click(entriesOfRow(container, 'Prospero')[0]);
    await fireEvent.click(poolChip(container, 'The Tempest'));

    expect(
      screen.getByLabelText(
        entryFilled$({ number: 1, source: 'Prospero', response: 'The Tempest' }),
      ),
    ).toBeVisible();
  });

  it('highlights every answer field a selected response could go in', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(container.querySelectorAll('.qti-match-field-target')).toHaveLength(0);

    await fireEvent.click(poolChip(container, 'Romeo and Juliet'));

    // one field per source, and the response has four uses
    expect(container.querySelectorAll('.qti-match-field-target')).toHaveLength(4);
    expect(poolChip(container, 'Romeo and Juliet')).toHaveClass('qti-match-chip-selected');
  });

  it('highlights a filled field too, since a response can be replaced', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    await fireEvent.click(poolChip(container, 'The Tempest'));

    expect(entriesOfRow(container, 'Capulet')[0]).toHaveClass('qti-match-entry-filled');
    expect(fieldOfRow(container, 'Capulet')).toHaveClass('qti-match-field-target');
  });

  it('does not highlight a field already holding that response', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    await fireEvent.click(poolChip(container, 'Romeo and Juliet'));

    // Capulet takes one response and already has this one
    expect(fieldOfRow(container, 'Capulet')).not.toHaveClass('qti-match-field-target');
    expect(fieldOfRow(container, 'Demetrius')).toHaveClass('qti-match-field-target');
  });

  it('highlights the pool once an entry is selected', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);

    await fireEvent.click(entriesOfRow(container, 'Capulet')[0]);

    expect(container.querySelectorAll('.qti-match-chip-candidate')).toHaveLength(3);
  });

  it('deselects a response when it is clicked again', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'The Tempest'));
    await fireEvent.click(poolChip(container, 'The Tempest'));

    expect(container.querySelectorAll('.qti-match-field-target')).toHaveLength(0);
  });

  it('takes a pairing back out when its entry is clicked', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    await fireEvent.click(entriesOfRow(container, 'Capulet')[0]);

    expect(screen.getByLabelText(entryEmpty$({ source: 'Capulet' }))).toBeVisible();
  });

  it('ignores a response with no uses left', async () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r1', 'h1'],
          ['r2', 'h1'],
        ],
      },
    });

    await fireEvent.click(poolChip(container, 'Birds'));

    expect(container.querySelectorAll('.qti-match-field-target')).toHaveLength(0);
  });

  it('ignores clicks in review mode', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      interactive: false,
    });

    await fireEvent.click(poolChip(container, 'The Tempest'));
    await fireEvent.click(entriesOfRow(container, 'Capulet')[0]);

    expect(screen.getByLabelText(entryEmpty$({ source: 'Capulet' }))).toBeVisible();
  });
});

describe('Response variable', () => {
  it('reports each pairing source first', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['match-example-1'].xml);

    await fireEvent.click(poolChip(container, 'Romeo and Juliet'));
    await fireEvent.click(entriesOfRow(container, 'Capulet')[0]);

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([['C', 'R']]);
    });
  });

  it('reports every pairing of a row holding more than one', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['match-example-2'].xml);

    await fireEvent.click(poolChip(container, 'Birds'));
    await fireEvent.click(entriesOfRow(container, 'Endothermic')[0]);
    await fireEvent.click(poolChip(container, 'Mammals'));
    await fireEvent.click(entriesOfRow(container, 'Endothermic')[1]);

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([
        ['r2', 'h1'],
        ['r2', 'h3'],
      ]);
    });
  });

  it('scores through the mapping when the answer is correct', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['match-example-1'].xml);

    const matches = [
      ['Capulet', 'Romeo and Juliet'],
      ['Demetrius', "A Midsummer-Night's Dream"],
      ['Lysander', "A Midsummer-Night's Dream"],
      ['Prospero', 'The Tempest'],
    ];
    for (const [source, target] of matches) {
      await fireEvent.click(poolChip(container, target));
      await fireEvent.click(entriesOfRow(container, source)[0]);
    }

    // 1 + 0.5 + 0.5 + 1 from the fixture's qti-mapping. A source/target
    // transposition would miss every map key and score 0, so this is the check
    // that the directed pairs come out the right way round.
    await waitFor(() => {
      expect(checkAnswer().outcomes.SCORE).toBe(3);
    });
  });

  it('does not write to the variable in review mode', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['match-example-1'].xml, {
      interactive: false,
    });

    await fireEvent.click(poolChip(container, 'The Tempest'));

    expect(checkAnswer().answerState.RESPONSE).toBeNull();
  });
});

describe('Explaining a refusal', () => {
  function refusalText(container) {
    return container.querySelector('.qti-match-refusal').textContent.trim();
  }

  it('says nothing until something is actually refused', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(refusalText(container)).toBe('');
  });

  it('explains that the pairing already exists', async () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: { RESPONSE: [['r2', 'h1']] },
    });

    await fireEvent.click(poolChip(container, 'Birds'));
    await fireEvent.click(entriesOfRow(container, 'Endothermic')[1]);

    expect(refusalText(container)).toBe(
      refusedAlreadyInRow$({ response: 'Birds', source: 'Endothermic' }),
    );
  });

  it('explains that the response has no matches left', async () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r1', 'h1'],
          ['r2', 'h1'],
        ],
      },
    });

    // h1 is spent, so it is no longer offered at all; reach it from a row
    await fireEvent.click(entriesOfRow(container, 'Asexual')[0]);
    await fireEvent.click(poolChip(container, 'Birds'));

    expect(refusalText(container)).toBe('');
  });

  it('announces the explanation as a live region', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(container.querySelector('.qti-match-refusal')).toHaveAttribute('role', 'status');
  });

  it('drops the explanation once the learner places something', async () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: { RESPONSE: [['r2', 'h1']] },
    });

    await fireEvent.click(poolChip(container, 'Birds'));
    await fireEvent.click(entriesOfRow(container, 'Endothermic')[1]);
    expect(refusalText(container)).not.toBe('');

    await fireEvent.click(poolChip(container, 'Mammals'));
    await fireEvent.click(entriesOfRow(container, 'Endothermic')[1]);

    await waitFor(() => expect(refusalText(container)).toBe(''));
  });
});

describe('Keyboard', () => {
  function optionsOf(entry) {
    return Array.from(entry.querySelectorAll('[role="option"]')).map(option => ({
      text: option.textContent.trim(),
      selected: option.getAttribute('aria-selected'),
    }));
  }

  function activeOptionText(entry) {
    const id = entry.getAttribute('aria-activedescendant');
    return entry.querySelector(`#${id}`).textContent.trim();
  }

  it('exposes every entry as a listbox that tab can reach', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);

    container.querySelectorAll('.qti-match-entry').forEach(entry => {
      expect(entry).toHaveAttribute('role', 'listbox');
      expect(entry).toHaveAttribute('tabindex', '0');
    });
  });

  it('keeps the response pool out of the tab order', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    const pool = container.querySelector('.qti-match-pool');

    expect(pool.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
  });

  it('offers only the targets still available for that row', () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: {
        RESPONSE: [
          ['r1', 'h1'],
          ['r2', 'h1'],
        ],
      },
    });

    // h1 is spent at match-max="2", so no other row may take it
    const texts = optionsOf(entriesOfRow(container, 'Possess Gills')[0]).map(option => option.text);
    expect(texts).toEqual(['Reptiles', 'Mammals']);
  });

  it("keeps an entry's own target among its options", () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    const options = optionsOf(entriesOfRow(container, 'Capulet')[0]);
    expect(options.map(option => option.text)).toContain('Romeo and Juliet');
    expect(options.filter(option => option.selected === 'true')).toHaveLength(1);
  });

  it("answers a row's first entry when it is tabbed to", async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    const entry = entriesOfRow(container, 'Capulet')[0];
    const first = optionsOf(entry)[0].text;

    await fireEvent.focus(entry);

    expect(entriesOfRow(container, 'Capulet')[0]).toHaveAttribute(
      'aria-label',
      entryFilled$({ number: 1, source: 'Capulet', response: first }),
    );
  });

  it('leaves the add-another position alone when it is tabbed to', async () => {
    const { container } = renderAssessmentItem(items['match-example-2'].xml, {
      answerState: { RESPONSE: [['r2', 'h1']] },
    });

    // r2 is match-max="0", so its row offers a trailing empty position
    await fireEvent.focus(entriesOfRow(container, 'Endothermic')[1]);

    expect(
      entriesOfRow(container, 'Endothermic').filter(entry =>
        entry.classList.contains('qti-match-entry-filled'),
      ),
    ).toHaveLength(1);
  });

  it('does not answer an entry a pointer press focused', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    const entry = entriesOfRow(container, 'Capulet')[0];

    await fireEvent.mouseDown(entry);
    await fireEvent.focus(entry);

    expect(screen.getByLabelText(entryEmpty$({ source: 'Capulet' }))).toBeVisible();
  });

  it('cycles the value in place with the arrow keys', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    const candidates = optionsOf(entriesOfRow(container, 'Capulet')[0]).map(o => o.text);

    await fireEvent.focus(entriesOfRow(container, 'Capulet')[0]);
    expect(activeOptionText(entriesOfRow(container, 'Capulet')[0])).toBe(candidates[0]);

    await fireEvent.keyDown(entriesOfRow(container, 'Capulet')[0], { key: 'ArrowDown' });
    expect(activeOptionText(entriesOfRow(container, 'Capulet')[0])).toBe(candidates[1]);

    await fireEvent.keyDown(entriesOfRow(container, 'Capulet')[0], { key: 'ArrowUp' });
    expect(activeOptionText(entriesOfRow(container, 'Capulet')[0])).toBe(candidates[0]);
  });

  it('jumps to the ends with Home and End', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    const candidates = optionsOf(entriesOfRow(container, 'Capulet')[0]).map(o => o.text);

    await fireEvent.focus(entriesOfRow(container, 'Capulet')[0]);
    await fireEvent.keyDown(entriesOfRow(container, 'Capulet')[0], { key: 'End' });
    expect(activeOptionText(entriesOfRow(container, 'Capulet')[0])).toBe(
      candidates[candidates.length - 1],
    );

    await fireEvent.keyDown(entriesOfRow(container, 'Capulet')[0], { key: 'Home' });
    expect(activeOptionText(entriesOfRow(container, 'Capulet')[0])).toBe(candidates[0]);
  });

  it('takes the pairing back out on Escape', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      answerState: { RESPONSE: [['C', 'R']] },
    });

    await fireEvent.keyDown(entriesOfRow(container, 'Capulet')[0], { key: 'Escape' });

    expect(screen.getByLabelText(entryEmpty$({ source: 'Capulet' }))).toBeVisible();
  });

  it('records the pairing built with the keyboard in the response variable', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['match-example-1'].xml);

    await fireEvent.focus(entriesOfRow(container, 'Capulet')[0]);

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toHaveLength(1);
      expect(checkAnswer().answerState.RESPONSE[0][0]).toBe('C');
    });
  });

  it('shows the stepper affordance on an operable entry', () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml);
    expect(entriesOfRow(container, 'Capulet')[0].querySelector('.qti-slot-stepper')).not.toBeNull();
  });

  it('is not reachable or operable in review mode', async () => {
    const { container } = renderAssessmentItem(items['match-example-1'].xml, {
      interactive: false,
    });
    const entry = entriesOfRow(container, 'Capulet')[0];

    expect(entry).not.toHaveAttribute('tabindex');
    expect(entry.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(entry.querySelector('.qti-slot-stepper')).toBeNull();

    await fireEvent.focus(entry);
    expect(screen.getByLabelText(entryEmpty$({ source: 'Capulet' }))).toBeVisible();
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
