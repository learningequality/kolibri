import { ref } from 'vue';
import useAssociateSlots from '../useAssociateSlots.js';

const CHOICES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

// Slot sides within an association row
const FIRST = 0;
const SECOND = 1;

function setup({ identifiers = CHOICES, rowCount = 3 } = {}) {
  return useAssociateSlots(identifiers, rowCount);
}

describe('slots', () => {
  it('starts with the requested number of empty rows', () => {
    const { slots } = setup({ rowCount: 3 });
    expect(slots.value).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('keeps what is already placed when the row count grows', () => {
    const rowCount = ref(1);
    const { slots, place } = setup({ rowCount });
    place('C1', 0, FIRST);

    rowCount.value = 2;

    expect(slots.value).toEqual([
      ['C1', null],
      [null, null],
    ]);
  });

  it('drops the trailing rows when the row count shrinks', () => {
    const rowCount = ref(2);
    const { slots, pool, place } = setup({ rowCount });
    place('C1', 1, FIRST);

    rowCount.value = 1;

    expect(slots.value).toEqual([[null, null]]);
    expect(pool.value).toContain('C1');
  });
});

describe('pool', () => {
  it('starts as every response, in presentation order', () => {
    const { pool } = setup();
    expect(pool.value).toEqual(CHOICES);
  });

  it('drops a response once it is placed, preserving the order of the rest', () => {
    const { pool, place } = setup();
    place('C3', 0, FIRST);
    expect(pool.value).toEqual(['C1', 'C2', 'C4', 'C5', 'C6']);
  });

  it('takes the response back when its slot is cleared', () => {
    const { pool, place, clear } = setup();
    place('C3', 0, FIRST);
    clear(0, FIRST);
    expect(pool.value).toEqual(CHOICES);
  });
});

describe('place', () => {
  it('fills an empty slot from the pool', () => {
    const { slots, place } = setup();
    place('C1', 1, SECOND);
    expect(slots.value[1]).toEqual([null, 'C1']);
  });

  it('returns the displaced response to the pool when the incoming one came from the pool', () => {
    const { slots, pool, place } = setup();
    place('C1', 0, FIRST);
    place('C2', 0, FIRST);

    expect(slots.value[0]).toEqual(['C2', null]);
    expect(pool.value).toContain('C1');
  });

  it('swaps two responses when the incoming one came from another slot', () => {
    const { slots, pool, place } = setup();
    place('C1', 0, FIRST);
    place('C2', 1, FIRST);

    place('C1', 1, FIRST);

    expect(slots.value[0]).toEqual(['C2', null]);
    expect(slots.value[1]).toEqual(['C1', null]);
    expect(pool.value).not.toContain('C1');
    expect(pool.value).not.toContain('C2');
  });

  it('empties the origin slot when moving a response to an empty slot', () => {
    const { slots, place } = setup();
    place('C1', 0, FIRST);
    place('C1', 2, SECOND);

    expect(slots.value[0]).toEqual([null, null]);
    expect(slots.value[2]).toEqual([null, 'C1']);
  });

  it('leaves state untouched when the response is already in that slot', () => {
    const { slots, place } = setup();
    place('C1', 0, FIRST);
    const before = slots.value;

    place('C1', 0, FIRST);

    expect(slots.value).toEqual(before);
  });

  it('ignores a row index outside the available rows', () => {
    const { slots, pool, place } = setup({ rowCount: 2 });
    place('C1', 5, FIRST);

    expect(slots.value).toEqual([
      [null, null],
      [null, null],
    ]);
    expect(pool.value).toEqual(CHOICES);
  });
});

describe('remove', () => {
  it('sends a placed response back to the pool', () => {
    const { slots, pool, place, remove } = setup();
    place('C4', 1, SECOND);

    remove('C4');

    expect(slots.value[1]).toEqual([null, null]);
    expect(pool.value).toEqual(CHOICES);
  });

  it('ignores a response that is not placed', () => {
    const { slots, pool, remove } = setup();
    remove('C4');

    expect(slots.value).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(pool.value).toEqual(CHOICES);
  });
});

describe('candidatesFor', () => {
  it('offers every response for an empty slot', () => {
    const { candidatesFor } = setup();
    expect(candidatesFor(0, FIRST)).toEqual(CHOICES);
  });

  it('excludes responses placed in another slot', () => {
    const { candidatesFor, place } = setup();
    place('C2', 1, FIRST);
    place('C5', 2, SECOND);

    expect(candidatesFor(0, FIRST)).toEqual(['C1', 'C3', 'C4', 'C6']);
  });

  it("keeps the slot's own response as a candidate", () => {
    const { candidatesFor, place } = setup();
    place('C2', 0, FIRST);

    expect(candidatesFor(0, FIRST)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
  });
});

describe('pairs', () => {
  it('is empty until a row is filled on both sides', () => {
    const { pairs, place } = setup();
    place('C1', 0, FIRST);
    expect(pairs.value).toEqual([]);
  });

  it('reports each fully filled row as a pair', () => {
    const { pairs, place } = setup();
    place('C1', 0, FIRST);
    place('C4', 0, SECOND);
    place('C2', 2, FIRST);
    place('C5', 2, SECOND);

    expect(pairs.value).toEqual([
      ['C1', 'C4'],
      ['C2', 'C5'],
    ]);
  });

  it('omits a row again once one of its sides is cleared', () => {
    const { pairs, place, clear } = setup();
    place('C1', 0, FIRST);
    place('C4', 0, SECOND);
    clear(0, SECOND);

    expect(pairs.value).toEqual([]);
  });
});

describe('hydrate', () => {
  it('restores slots from a response variable value', () => {
    const { slots, pool, hydrate } = setup();
    hydrate([
      ['C1', 'C4'],
      ['C2', 'C5'],
    ]);

    expect(slots.value).toEqual([
      ['C1', 'C4'],
      ['C2', 'C5'],
      [null, null],
    ]);
    expect(pool.value).toEqual(['C3', 'C6']);
  });

  it('round-trips the value derived from pairs', () => {
    const { pairs, place, hydrate } = setup();
    place('C3', 0, FIRST);
    place('C6', 0, SECOND);
    const derived = pairs.value;

    hydrate(derived);

    expect(pairs.value).toEqual(derived);
  });

  it('clears any existing placements', () => {
    const { slots, place, hydrate } = setup();
    place('C1', 2, FIRST);

    hydrate([['C2', 'C5']]);

    expect(slots.value).toEqual([
      ['C2', 'C5'],
      [null, null],
      [null, null],
    ]);
  });

  it('drops pairs naming a response the item does not declare', () => {
    const { slots, hydrate } = setup();
    hydrate([
      ['C1', 'NOPE'],
      ['C2', 'C5'],
    ]);

    expect(slots.value[0]).toEqual(['C2', 'C5']);
  });

  it('drops a later pair that reuses an already placed response', () => {
    const { slots, hydrate } = setup();
    hydrate([
      ['C1', 'C4'],
      ['C1', 'C5'],
    ]);

    expect(slots.value).toEqual([
      ['C1', 'C4'],
      [null, null],
      [null, null],
    ]);
  });

  it('ignores malformed entries and non-array values', () => {
    const { slots, hydrate } = setup();

    hydrate([['C1'], 'C2 C5', null, ['C3', 'C6']]);
    expect(slots.value[0]).toEqual(['C3', 'C6']);

    hydrate(null);
    expect(slots.value).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('keeps only as many pairs as there are rows', () => {
    const { slots, hydrate } = setup({ rowCount: 1 });
    hydrate([
      ['C1', 'C4'],
      ['C2', 'C5'],
    ]);

    expect(slots.value).toEqual([['C1', 'C4']]);
  });
});
