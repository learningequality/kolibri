import { ref } from 'vue';
import useMatchRows from '../useMatchRows.js';

// Shaped after match-example-1: four sources used once each, three targets
// reusable up to four times.
const SOURCES = ['C', 'D', 'L', 'P'];
const TARGETS = ['M', 'R', 'T'];
const MATCH_MAX = { C: 1, D: 1, L: 1, P: 1, M: 4, R: 4, T: 4 };

function setup({
  sourceIds = SOURCES,
  targetIds = TARGETS,
  matchMax = MATCH_MAX,
  maxAssociations = 0,
} = {}) {
  return useMatchRows({
    sourceIds,
    targetIds,
    matchMaxOf: identifier => matchMax[identifier] ?? 1,
    maxAssociations,
  });
}

describe('rows', () => {
  it('starts with one empty row per source', () => {
    const { rows } = setup();
    expect(rows.value).toEqual([[], [], [], []]);
  });

  it('offers one empty position per row until the row is full', () => {
    const { entriesFor, place } = setup();
    expect(entriesFor(0)).toEqual([null]);

    place('M', 0, 0);

    // sources have match-max 1, so the row is now full and offers no more
    expect(entriesFor(0)).toEqual(['M']);
  });

  it('keeps offering an empty position while a row has room', () => {
    // match-example-2 shape: unlimited sources, targets capped at 2
    const { entriesFor, place } = setup({
      sourceIds: ['r1', 'r2'],
      targetIds: ['h1', 'h2', 'h3'],
      matchMax: { r1: 0, r2: 0, h1: 2, h2: 2, h3: 2 },
    });

    place('h1', 1, 0);
    expect(entriesFor(1)).toEqual(['h1', null]);

    place('h3', 1, 1);
    expect(entriesFor(1)).toEqual(['h1', 'h3', null]);
  });
});

describe('reuse across rows', () => {
  it('lets a target be paired with several sources', () => {
    const { rows, place } = setup();
    place('M', 1, 0);
    place('M', 2, 0);

    expect(rows.value[1]).toEqual(['M']);
    expect(rows.value[2]).toEqual(['M']);
  });

  it('keeps the target available until its match-max is spent', () => {
    const { isExhausted, remainingOf, place } = setup({
      matchMax: { ...MATCH_MAX, M: 2 },
    });
    expect(remainingOf('M')).toBe(2);

    place('M', 0, 0);
    expect(isExhausted('M')).toBe(false);

    place('M', 1, 0);
    expect(remainingOf('M')).toBe(0);
    expect(isExhausted('M')).toBe(true);
  });

  it('refuses a target that has no uses left', () => {
    const { rows, place } = setup({ matchMax: { ...MATCH_MAX, M: 1 } });
    place('M', 0, 0);

    place('M', 1, 0);

    expect(rows.value[1]).toEqual([]);
  });

  it('frees a use when the target is taken out again', () => {
    const { remainingOf, place, clear } = setup({ matchMax: { ...MATCH_MAX, M: 1 } });
    place('M', 0, 0);
    expect(remainingOf('M')).toBe(0);

    clear(0, 0);

    expect(remainingOf('M')).toBe(1);
  });

  it('treats match-max="0" on a target as one use per source', () => {
    const { remainingOf } = setup({ matchMax: { ...MATCH_MAX, M: 0 } });
    expect(remainingOf('M')).toBe(SOURCES.length);
  });
});

describe('place', () => {
  it('appends at the empty position', () => {
    const { rows, place } = setup({
      sourceIds: ['r1'],
      targetIds: ['h1', 'h2'],
      matchMax: { r1: 0, h1: 2, h2: 2 },
    });

    place('h1', 0, 0);
    place('h2', 0, 1);

    expect(rows.value[0]).toEqual(['h1', 'h2']);
  });

  it('replaces the target already at that position', () => {
    const { rows, place } = setup();
    place('M', 0, 0);

    place('R', 0, 0);

    expect(rows.value[0]).toEqual(['R']);
  });

  it('never pairs a source with the same target twice', () => {
    const { rows, place } = setup({
      sourceIds: ['r1'],
      targetIds: ['h1', 'h2'],
      matchMax: { r1: 0, h1: 2, h2: 2 },
    });
    place('h1', 0, 0);

    place('h1', 0, 1);

    expect(rows.value[0]).toEqual(['h1']);
  });

  it('refuses to exceed the row capacity from its source match-max', () => {
    const { rows, place } = setup();
    place('M', 0, 0);

    // C has match-max 1, so there is no second position to place into
    place('R', 0, 1);

    expect(rows.value[0]).toEqual(['M']);
  });

  it('refuses to exceed max-associations across all rows', () => {
    const { pairs, place } = setup({ maxAssociations: 2 });
    place('M', 0, 0);
    place('R', 1, 0);

    place('T', 2, 0);

    expect(pairs.value).toHaveLength(2);
  });

  it('ignores an unknown target or a row that does not exist', () => {
    const { rows, place } = setup();
    place('NOPE', 0, 0);
    place('M', 9, 0);

    expect(rows.value).toEqual([[], [], [], []]);
  });
});

describe('candidatesFor', () => {
  it('offers every target for an empty row', () => {
    const { candidatesFor } = setup();
    expect(candidatesFor(0, 0)).toEqual(TARGETS);
  });

  it('excludes a target already paired with that source', () => {
    const { candidatesFor, place } = setup({
      sourceIds: ['r1'],
      targetIds: ['h1', 'h2', 'h3'],
      matchMax: { r1: 0, h1: 2, h2: 2, h3: 2 },
    });
    place('h1', 0, 0);

    expect(candidatesFor(0, 1)).toEqual(['h2', 'h3']);
  });

  it('excludes a target with no uses left, but keeps it for its own position', () => {
    const { candidatesFor, place } = setup({ matchMax: { ...MATCH_MAX, M: 1 } });
    place('M', 0, 0);

    expect(candidatesFor(1, 0)).toEqual(['R', 'T']);
    expect(candidatesFor(0, 0)).toContain('M');
  });

  it('never offers a placement that place would refuse', () => {
    const { candidatesFor, canPlace, place } = setup({ matchMax: { ...MATCH_MAX, M: 1 } });
    place('M', 0, 0);

    [0, 1, 2, 3].forEach(rowIndex => {
      candidatesFor(rowIndex, 0).forEach(identifier => {
        const isOwnValue = identifier === 'M' && rowIndex === 0;
        expect(isOwnValue || canPlace(identifier, rowIndex, 0)).toBe(true);
      });
    });
  });
});

describe('canPlace while moving between rows', () => {
  it('discounts the use held by the row the target is leaving', () => {
    const { canPlace, place } = setup({ matchMax: { ...MATCH_MAX, M: 1 } });
    place('M', 0, 0);

    // M has no uses left, so it cannot be added to another row
    expect(canPlace('M', 1, 0)).toBe(false);
    // but moving it out of row 0 frees the one use it holds
    expect(canPlace('M', 1, 0, { fromRow: 0 })).toBe(true);
  });

  it('still refuses a row that already holds that target', () => {
    const { canPlace, place } = setup({
      sourceIds: ['r1', 'r2'],
      targetIds: ['h1', 'h2'],
      matchMax: { r1: 0, r2: 0, h1: 1, h2: 1 },
    });
    place('h1', 0, 0);

    expect(canPlace('h1', 0, 1, { fromRow: 0 })).toBe(false);
  });

  it('does not let a move breach max-associations, since the total is unchanged', () => {
    const { canPlace, place } = setup({ maxAssociations: 1 });
    place('M', 0, 0);

    expect(canPlace('R', 1, 0)).toBe(false);
    expect(canPlace('M', 1, 0, { fromRow: 0 })).toBe(true);
  });
});

describe('pairs', () => {
  it('reports each entry as a directed pair, source first', () => {
    const { pairs, place } = setup();
    place('R', 0, 0);
    place('M', 1, 0);

    expect(pairs.value).toEqual([
      ['C', 'R'],
      ['D', 'M'],
    ]);
  });

  it('reports every entry of a multi-target row', () => {
    const { pairs, place } = setup({
      sourceIds: ['r1', 'r2'],
      targetIds: ['h1', 'h3'],
      matchMax: { r1: 0, r2: 0, h1: 2, h3: 2 },
    });
    place('h1', 1, 0);
    place('h3', 1, 1);

    expect(pairs.value).toEqual([
      ['r2', 'h1'],
      ['r2', 'h3'],
    ]);
  });
});

describe('hydrate', () => {
  it('restores rows from a response variable value', () => {
    const { rows, hydrate } = setup();
    hydrate([
      ['C', 'R'],
      ['D', 'M'],
      ['L', 'M'],
      ['P', 'T'],
    ]);

    expect(rows.value).toEqual([['R'], ['M'], ['M'], ['T']]);
  });

  it('round-trips the value derived from pairs', () => {
    const { pairs, place, hydrate } = setup();
    place('R', 0, 0);
    place('M', 2, 0);
    const derived = pairs.value;

    hydrate(derived);

    expect(pairs.value).toEqual(derived);
  });

  it('drops pairs naming an unknown source or target', () => {
    const { rows, hydrate } = setup();
    hydrate([
      ['NOPE', 'M'],
      ['C', 'NOPE'],
      ['D', 'R'],
    ]);

    expect(rows.value).toEqual([[], ['R'], [], []]);
  });

  it('drops a repeated pair', () => {
    const { rows, hydrate } = setup({
      sourceIds: ['r1'],
      targetIds: ['h1'],
      matchMax: { r1: 0, h1: 2 },
    });
    hydrate([
      ['r1', 'h1'],
      ['r1', 'h1'],
    ]);

    expect(rows.value[0]).toEqual(['h1']);
  });

  it('drops pairs that would break a match-max', () => {
    const { rows, hydrate } = setup({ matchMax: { ...MATCH_MAX, M: 1 } });
    hydrate([
      ['C', 'M'],
      ['D', 'M'],
    ]);

    expect(rows.value).toEqual([['M'], [], [], []]);
  });

  it('drops pairs beyond max-associations', () => {
    const { pairs, hydrate } = setup({ maxAssociations: 1 });
    hydrate([
      ['C', 'R'],
      ['D', 'M'],
    ]);

    expect(pairs.value).toEqual([['C', 'R']]);
  });

  it('ignores malformed entries and non-array values', () => {
    const { rows, hydrate } = setup();

    hydrate([['C'], 'D M', null, ['L', 'T']]);
    expect(rows.value).toEqual([[], [], ['T'], []]);

    hydrate(null);
    expect(rows.value).toEqual([[], [], [], []]);
  });
});

describe('reactive choices', () => {
  it('follows a change to the pool order', () => {
    const targetIds = ref(['M', 'R', 'T']);
    const { pool } = setup({ targetIds });

    targetIds.value = ['T', 'R', 'M'];

    expect(pool.value).toEqual(['T', 'R', 'M']);
  });
});
