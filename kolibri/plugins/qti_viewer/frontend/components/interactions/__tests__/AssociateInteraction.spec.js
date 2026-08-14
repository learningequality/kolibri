import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';
import { slotListboxStrings } from '../../../composables/useSlotListbox';
import { associateStrings } from '../AssociateInteraction.vue';

const {
  responsePoolLabel$,
  firstSlotEmpty$,
  secondSlotEmpty$,
  firstSlotFilled$,
  secondSlotFilled$,
} = associateStrings;

const { emptyOption$ } = slotListboxStrings;

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

// A placed response stays in the pool, disabled, so the pool never reflows.
function availablePoolChips(container) {
  return Array.from(container.querySelectorAll('.qti-associate-pool-entry .qti-associate-chip'))
    .filter(chip => !chip.classList.contains('qti-associate-chip-disabled'))
    .map(chip => chip.textContent.trim());
}

describe('Smoke', () => {
  it('renders the prompt', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    expect(container).toHaveTextContent(/Match each country to its capital city\./);
  });

  it('renders the associate answer guide', () => {
    renderAssessmentItem(items['associate-interaction-1'].xml);
    expect(
      screen.getByText(answerGuideStrings.chooseThenTarget$(), {
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
  it('fills slots from injected answerState and disables those responses in the pool', () => {
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
    expect(poolEntries(container)).toHaveLength(6);
    expect(availablePoolChips(container).sort()).toEqual(['Japan', 'Tokyo']);
  });

  it('re-renders when the answer state changes', async () => {
    const { container, setAnswerState } = renderAssessmentItem(
      items['associate-interaction-1'].xml,
    );
    expect(availablePoolChips(container)).toHaveLength(6);

    setAnswerState({ RESPONSE: [['C3', 'C6']] });

    await waitFor(() => {
      expect(availablePoolChips(container).sort()).toEqual([
        'Berlin',
        'France',
        'Germany',
        'Paris',
      ]);
    });
  });
});

describe('Placed responses in the pool', () => {
  it('keeps the response in place, disabled, rather than removing it', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const orderBefore = poolEntries(container);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));

    expect(poolEntries(container)).toEqual(orderBefore);
    expect(poolChip(container, 'France')).toHaveClass('qti-associate-chip-disabled');
    expect(poolChip(container, 'France')).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not let a disabled response be picked up from the pool', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: { RESPONSE: [['C1', 'C4']] },
    });

    await fireEvent.click(poolChip(container, 'France'));

    expect(container.querySelectorAll('.qti-associate-slot-target')).toHaveLength(0);
  });

  it('leaves a disabled response out of the draggable items', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: { RESPONSE: [['C1', 'C4']] },
    });

    expect(poolChip(container, 'France').closest('.draggable-item')).toBeNull();
    expect(poolChip(container, 'Japan').closest('.draggable-item')).not.toBeNull();
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
    expect(poolChip(container, 'France')).toHaveClass('qti-associate-chip-disabled');
  });

  it('frees the displaced response in the pool when dropped on a filled slot', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      answerState: { RESPONSE: [['C1', 'C4']] },
    });

    await dragInto(firstSlotFilled$({ number: 1, response: 'France' }), 'C3');

    expect(screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'Japan' }))).toBeVisible();
    expect(poolChip(container, 'France')).not.toHaveClass('qti-associate-chip-disabled');
    expect(poolChip(container, 'Japan')).toHaveClass('qti-associate-chip-disabled');
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
    expect(poolChip(container, 'France')).toHaveClass('qti-associate-chip-disabled');
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
    expect(poolChip(container, 'France')).toHaveClass('qti-associate-chip-disabled');
  });

  it('frees the displaced response in the pool when a filled slot is reused', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.click(poolChip(container, 'France'));
    await fireEvent.click(screen.getByLabelText(firstSlotEmpty$({ number: 1 })));
    await fireEvent.click(poolChip(container, 'Japan'));
    await fireEvent.click(
      screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'France' })),
    );

    expect(screen.getByLabelText(firstSlotFilled$({ number: 1, response: 'Japan' }))).toBeVisible();
    expect(poolChip(container, 'France')).not.toHaveClass('qti-associate-chip-disabled');
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

describe('Keyboard', () => {
  function slotAt(container, index) {
    return container.querySelectorAll('.qti-associate-slot')[index];
  }

  function optionsOf(slot) {
    return Array.from(slot.querySelectorAll('[role="option"]')).map(option => ({
      text: option.textContent.trim(),
      selected: option.getAttribute('aria-selected'),
      id: option.id,
    }));
  }

  // The responses alone, without the empty option that leads them
  function responsesOf(slot) {
    return optionsOf(slot).slice(1);
  }

  function activeOptionText(slot) {
    const id = slot.getAttribute('aria-activedescendant');
    return slot.querySelector(`#${id}`).textContent.trim();
  }

  it('exposes each slot as a listbox that tab can reach', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    slots(container).forEach(slot => {
      expect(slot).toHaveAttribute('role', 'listbox');
      expect(slot).toHaveAttribute('tabindex', '0');
    });
  });

  it('keeps the response pool out of the tab order', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const pool = container.querySelector('.qti-associate-pool');

    expect(pool.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
    expect(pool.querySelectorAll('button, a, input, select')).toHaveLength(0);
  });

  // Decorative: the arrows say the value can be stepped, and CSS shows them only
  // while the slot holds keyboard focus. A reader gets the value from the options.
  it('gives each slot an up/down affordance that is hidden from screen readers', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    slots(container).forEach(slot => {
      const stepper = slot.querySelector('.qti-slot-stepper');
      expect(stepper).not.toBeNull();
      expect(stepper).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('leaves the up/down affordance out in review mode', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      interactive: false,
    });

    expect(container.querySelectorAll('.qti-slot-stepper')).toHaveLength(0);
  });

  it('hides the options visually while exposing them to a screen reader', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const slot = slotAt(container, 0);

    expect(slot.querySelector('[role="option"]').closest('.qti-visually-hidden')).not.toBeNull();
    // the six responses, led by the empty option
    expect(optionsOf(slot)).toHaveLength(7);
  });

  it('fills the slot with the first valid response when focused', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const slot = slotAt(container, 0);
    const firstCandidate = responsesOf(slot)[0].text;

    await fireEvent.focus(slot);

    expect(slotAt(container, 0)).toHaveAttribute(
      'aria-label',
      firstSlotFilled$({ number: 1, response: firstCandidate }),
    );
  });

  it('does not fill the slot when a pointer press is what focused it', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const slot = slotAt(container, 0);

    // A press always precedes the focus it causes
    await fireEvent.mouseDown(slot);
    await fireEvent.focus(slot);

    expect(slotAt(container, 0)).toHaveAttribute('aria-label', firstSlotEmpty$({ number: 1 }));
  });

  it('cycles the value in place with the arrow keys', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const responses = responsesOf(slotAt(container, 0)).map(option => option.text);

    await fireEvent.focus(slotAt(container, 0));
    expect(activeOptionText(slotAt(container, 0))).toBe(responses[0]);

    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowDown' });
    expect(activeOptionText(slotAt(container, 0))).toBe(responses[1]);

    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowUp' });
    expect(activeOptionText(slotAt(container, 0))).toBe(responses[0]);
  });

  it('empties the slot by stepping back past the first response', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.focus(slotAt(container, 0));
    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowUp' });

    expect(activeOptionText(slotAt(container, 0))).toBe(emptyOption$());
    expect(slotAt(container, 0)).toHaveAttribute('aria-label', firstSlotEmpty$({ number: 1 }));
  });

  it('offers the empty option first, so an unanswered slot starts on it', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const slot = slotAt(container, 0);

    // A pointer press focuses without answering, which is how a slot comes to be
    // focused and still empty
    await fireEvent.mouseDown(slot);
    await fireEvent.focus(slot);

    expect(optionsOf(slot)[0].text).toBe(emptyOption$());
    expect(activeOptionText(slotAt(container, 0))).toBe(emptyOption$());
  });

  it('clamps at the ends and jumps with Home and End', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    // the empty option included: Home lands on it, End on the last response
    const candidates = optionsOf(slotAt(container, 0)).map(option => option.text);

    await fireEvent.focus(slotAt(container, 0));
    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowUp' });
    expect(activeOptionText(slotAt(container, 0))).toBe(candidates[0]);

    await fireEvent.keyDown(slotAt(container, 0), { key: 'End' });
    expect(activeOptionText(slotAt(container, 0))).toBe(candidates[candidates.length - 1]);

    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowDown' });
    expect(activeOptionText(slotAt(container, 0))).toBe(candidates[candidates.length - 1]);

    await fireEvent.keyDown(slotAt(container, 0), { key: 'Home' });
    expect(activeOptionText(slotAt(container, 0))).toBe(candidates[0]);
  });

  it('tracks the current value with aria-selected', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.focus(slotAt(container, 0));
    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowDown' });

    const options = optionsOf(slotAt(container, 0));
    expect(options.filter(option => option.selected === 'true')).toHaveLength(1);
    // the second response, since the empty option leads the list
    expect(options[2].selected).toBe('true');
  });

  it('keeps the slot own response among its candidates so cycling is reversible', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);
    const before = optionsOf(slotAt(container, 0)).map(option => option.text);

    await fireEvent.focus(slotAt(container, 0));
    await fireEvent.keyDown(slotAt(container, 0), { key: 'ArrowDown' });

    expect(optionsOf(slotAt(container, 0)).map(option => option.text)).toEqual(before);
  });

  it('empties the slot on Escape', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.focus(slotAt(container, 0));
    await fireEvent.keyDown(slotAt(container, 0), { key: 'Escape' });

    expect(slotAt(container, 0)).toHaveAttribute('aria-label', firstSlotEmpty$({ number: 1 }));
  });

  it('records the pair built with the keyboard in the response variable', async () => {
    const { container, checkAnswer } = renderAssessmentItem(items['associate-interaction-1'].xml);

    await fireEvent.focus(slotAt(container, 0));
    await fireEvent.blur(slotAt(container, 0));
    await fireEvent.focus(slotAt(container, 1));
    await fireEvent.blur(slotAt(container, 1));

    await waitFor(() => {
      expect(checkAnswer().answerState.RESPONSE).toHaveLength(1);
    });
  });

  it('names an image response by its alt text', () => {
    const { container } = renderAssessmentItem(items['associate-interaction-images'].xml);

    expect(optionsOf(slotAt(container, 0)).map(option => option.text)).toEqual(
      expect.arrayContaining(['A blue circle', 'A pink square', 'A green triangle']),
    );
  });

  it('is not reachable or operable in review mode', async () => {
    const { container } = renderAssessmentItem(items['associate-interaction-1'].xml, {
      interactive: false,
    });
    const slot = slotAt(container, 0);

    expect(slot).not.toHaveAttribute('tabindex');
    expect(slot).not.toHaveAttribute('role', 'listbox');
    expect(slot.querySelectorAll('[role="option"]')).toHaveLength(0);

    await fireEvent.focus(slot);
    expect(slotAt(container, 0)).toHaveAttribute('aria-label', firstSlotEmpty$({ number: 1 }));
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
