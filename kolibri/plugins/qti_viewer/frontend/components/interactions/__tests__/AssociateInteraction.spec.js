import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { associateStrings } from '../AssociateInteraction.vue';

const {
  responsePoolLabel$,
  firstSlotEmpty$,
  secondSlotEmpty$,
  firstSlotFilled$,
  secondSlotFilled$,
} = associateStrings;

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

// Response content comes from the fixture XML rather than a translation, so it
// is matched on the rendered chip instead of through a *ByText query.
function poolChip(container, text) {
  return Array.from(
    container.querySelectorAll('.qti-associate-pool-entry .qti-associate-chip'),
  ).find(chip => chip.textContent.trim() === text);
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

async function dragInto(label, identifier) {
  const regions = findRegions();
  const target = regions.find(region => region.label === label);
  const source = regions.find(region => region.items.some(item => item.identifier === identifier));
  const sourceItemsBeforeDrag = source.items;

  target.$emit('update:items', [...target.items, { identifier }]);
  source.$emit(
    'update:items',
    sourceItemsBeforeDrag.filter(item => item.identifier !== identifier),
  );
  await target.$nextTick();
}

describe('Placing by drag', () => {
  it('fills an empty slot dragged onto from the pool', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await dragInto(firstSlotEmpty$({ number: 1 }), 'C1');

    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
    ).toBeVisible();
    expect(poolChip(container, 'France')).toBeUndefined();
  });

  it('returns the displaced response to the pool when dropped on a filled slot', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: { RESPONSE: [['C1', 'C4']] },
    });

    await dragInto(firstSlotFilled$({ number: 1, response: 'France' }), 'C3');

    expect(screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'Japan' }))).toBeVisible();
    expect(poolChip(container, 'France')).toBeDefined();
    expect(poolChip(container, 'Japan')).toBeUndefined();
  });

  it('swaps two responses when one filled slot is dropped on the other', async () => {
    renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: {
        RESPONSE: [
          ['C1', 'C4'],
          ['C2', 'C5'],
        ],
      },
    });

    await dragInto(firstSlotFilled$({ number: 2, response: 'Germany' }), 'C1');

    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 2, response: 'France' })),
    ).toBeVisible();
    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'Germany' })),
    ).toBeVisible();
  });

  it('empties the slot when a response is dragged back to the pool', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: { RESPONSE: [['C1', 'C4']] },
    });

    await dragInto(responsePoolLabel$(), 'C1');

    expect(screen.getByLabelText(firstSlotEmpty$({ number: 1 }))).toBeVisible();
    expect(poolChip(container, 'France')).toBeDefined();
  });

  it('updates the response variable after a drag completes a pair', async () => {
    const { checkAnswer } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await dragInto(firstSlotEmpty$({ number: 1 }), 'C2');
    await dragInto(secondSlotEmpty$({ number: 1 }), 'C5');

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([['C2', 'C5']]);
    });
  });

  it('disables the regions in review mode', () => {
    renderAssessmentItem(items['associate-interaction-1'].xml, { interactive: false });

    expect(findRegions().every(region => region.disabled)).toBe(true);
  });

  it('labels each region so the drop is announced', () => {
    renderAssessmentItem(items['associate-interaction-1'].xml);

    expect(regionLabelled(responsePoolLabel$())).toBeDefined();
    expect(regionLabelled(firstSlotEmpty$({ number: 1 }))).toBeDefined();
    expect(regionLabelled(secondSlotEmpty$({ number: 3 }))).toBeDefined();
  });
});

describe('Placing by click', () => {
  it('places a selected response into the slot clicked next', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));

    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
    ).toBeVisible();
    expect(poolChip(container, 'France')).toBeUndefined();
  });

  it('places into a slot chosen before the response', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(screen.getByLabelText(secondSlotEmpty$({ number: 2 })));
    await fireEvent.click(poolChip(container, 'Tokyo'));

    expect(
      screen.getByLabelText(secondSlotFilled$({ number: 2, response: 'Tokyo' })),
    ).toBeVisible();
  });

  it('highlights the empty slots once a response is selected', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    expect(container.querySelectorAll('.qti-associate-slot-target')).toHaveLength(0);

    await fireEvent.click(poolChip(container, 'France'));

    expect(container.querySelectorAll('.qti-associate-slot-target')).toHaveLength(6);
    expect(poolChip(container, 'France')).toHaveClass('qti-associate-chip-selected');
  });

  it('does not highlight a filled slot as a valid target', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));
    await fireEvent.click(poolChip(container, 'Japan'));

    const highlighted = container.querySelectorAll('.qti-associate-slot-target');
    expect(highlighted).toHaveLength(5);
    Array.from(highlighted).forEach(slot => {
      expect(slot).not.toHaveClass('qti-associate-slot-filled');
    });
  });

  it('highlights the pool once a slot is selected', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));

    expect(container.querySelectorAll('.qti-associate-chip-candidate')).toHaveLength(6);
  });

  it('deselects a response when it is clicked again', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(poolChip(container, 'France'));

    expect(container.querySelectorAll('.qti-associate-slot-target')).toHaveLength(0);
  });

  it('swaps two responses when one filled slot is clicked then the other', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: {
        RESPONSE: [
          ['C1', 'C4'],
          ['C2', 'C5'],
        ],
      },
    });

    await fireEvent.click(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
    );
    await fireEvent.click(
      screen.getByLabelText(firstSlotFilled$({ number: 2, response: 'Germany' })),
    );

    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'Germany' })),
    ).toBeVisible();
    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 2, response: 'France' })),
    ).toBeVisible();
    expect(poolChip(container, 'France')).toBeUndefined();
  });

  it('returns the displaced response to the pool when a filled slot is reused', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));
    await fireEvent.click(poolChip(container, 'Japan'));
    await fireEvent.click(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
    );

    expect(screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'Japan' }))).toBeVisible();
    expect(poolChip(container, 'France')).toBeDefined();
  });

  it('ignores clicks in review mode', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      interactive: false,
    });

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));

    expect(screen.getByLabelText(firstSlotEmpty$({ number: 1 }))).toBeVisible();
  });
});

describe('Response variable', () => {
  it('reports a completed pair on submit', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));
    await fireEvent.click(poolChip(container, 'Paris'));
    await fireEvent.click(screen.getByLabelText(secondSlotEmpty$({ number: 1 })));

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([['C1', 'C4']]);
    });
  });

  it('omits a row that is only half filled', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toEqual([]);
    });
  });

  it('keeps a half-filled row when the completed pairs are written back', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    // Complete row 2, then half-fill row 1: writing the derived pairs must not
    // compact the rows and lose the lone response.
    await fireEvent.click(poolChip(container, 'Germany'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 2 })));
    await fireEvent.click(poolChip(container, 'Berlin'));
    await fireEvent.click(screen.getByLabelText(secondSlotEmpty$({ number: 2 })));
    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));

    await waitFor(() => {
      expect(
        screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
      ).toBeVisible();
    });
    expect(
      screen.getByLabelText(firstSlotFilled$({ number: 2, response: 'Germany' })),
    ).toBeVisible();
  });

  it('scores the item through the mapping when the answer is correct', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['associate-interaction-1'].xml);

    const pairs = [
      ['France', 'Paris'],
      ['Germany', 'Berlin'],
      ['Japan', 'Tokyo'],
    ];
    for (const [rowIndex, [left, right]] of pairs.entries()) {
      const number = rowIndex + 1;
      await fireEvent.click(poolChip(container, left));
      await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number })));
      await fireEvent.click(poolChip(container, right));
      await fireEvent.click(screen.getByLabelText(secondSlotEmpty$({ number })));
    }

    await waitFor(() => {
      expect(checkAnswer().outcomes.SCORE).toBe(3);
    });
  });

  it('does not write to the variable in review mode', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      interactive: false,
    });

    await fireEvent.click(poolChip(container, 'France'));

    expect(checkAnswer().answerState.RESPONSE).toBeNull();
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
