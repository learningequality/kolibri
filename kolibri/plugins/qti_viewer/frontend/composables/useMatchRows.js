import { computed, ref, unref } from 'vue';

function countUses(rows, identifier) {
  return rows.reduce((total, row) => total + row.filter(id => id === identifier).length, 0);
}

function countPairs(rows) {
  return rows.reduce((total, row) => total + row.length, 0);
}

/**
 * Why a placement was refused. The rules live in one place so the explanation
 * a learner is shown can never drift from the decision that produced it.
 */
export const PROBLEM = Object.freeze({
  UNKNOWN: 'unknown',
  ALREADY_HERE: 'alreadyHere',
  ALREADY_IN_ROW: 'alreadyInRow',
  ROW_FULL: 'rowFull',
  MAX_ASSOCIATIONS: 'maxAssociations',
  NO_USES_LEFT: 'noUsesLeft',
});

/**
 * Which end of a directed pair the row's source is. A pair is ordered, so an
 * interaction has to say which of its two sets the base type names first:
 * `qti-match-interaction` authors its pairs source-first, `qti-gap-match-interaction`
 * authors them pool-choice-first.
 */
export const PAIR_ORDER = Object.freeze({
  ROW_FIRST: 'rowFirst',
  POOL_FIRST: 'poolFirst',
});

/**
 * Track which targets are paired with each source, and the limits on doing so.
 * @param {object} options - The interaction's choices and limits
 * @param {import('vue').Ref<string[]>|string[]} options.sourceIds - First set,
 * in row order
 * @param {import('vue').Ref<string[]>|string[]} options.targetIds - Second set,
 * in pool presentation order
 * @param {Function} options.matchMaxOf - `(identifier) => number`, the choice's
 * own `match-max`, where 0 means no limit
 * @param {import('vue').Ref<number>|number} [options.maxAssociations] - Cap on
 * the total number of pairs, where 0 means no limit
 * @param {string} [options.pairOrder] - Which end of each directed pair the row's
 * source is, see {@link PAIR_ORDER}. Fixed for an interaction, so not a ref.
 * @returns {object} The row state and the operations over it
 */
export default function useMatchRows({
  sourceIds,
  targetIds,
  matchMaxOf,
  maxAssociations = 0,
  pairOrder = PAIR_ORDER.ROW_FIRST,
}) {
  const stored = ref([]);

  const sources = () => unref(sourceIds);
  const targets = () => unref(targetIds);

  // Reading and writing a pair go through these two, so the order can never be
  // applied in one direction and forgotten in the other.
  const poolFirst = pairOrder === PAIR_ORDER.POOL_FIRST;
  const toPair = (source, target) => (poolFirst ? [target, source] : [source, target]);
  const fromPair = pair => (poolFirst ? [pair[1], pair[0]] : [pair[0], pair[1]]);

  // Normalise on read, so a change to the choices cannot leave stale rows
  const rows = computed(() =>
    sources().map((_, index) => (stored.value[index] ? [...stored.value[index]] : [])),
  );

  // `match-max="0"` is unlimited, but a directed pair is unique, so a source can
  // hold each target at most once and a target can serve each source at most once
  function rowCapacity(rowIndex) {
    return matchMaxOf(sources()[rowIndex]) || targets().length;
  }

  function targetCapacity(identifier) {
    return matchMaxOf(identifier) || sources().length;
  }

  function maxPairs() {
    return unref(maxAssociations) || Infinity;
  }

  const usesOf = computed(() => {
    const counts = new Map();
    rows.value.flat().forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
    return counts;
  });

  function remainingOf(identifier) {
    return targetCapacity(identifier) - (usesOf.value.get(identifier) || 0);
  }

  /** Targets that still have a use left, in presentation order. */
  const pool = computed(() => targets());

  /**
   * Whether the pool should show this target as spent.
   * @param {string} identifier - A target identifier
   * @returns {boolean} True once every use of it has been taken
   */
  function isExhausted(identifier) {
    return remainingOf(identifier) <= 0;
  }

  /**
   * The addressable positions in a row: its entries, plus one trailing empty
   * position while the row still has room, which is the "add" affordance.
   * @param {number} rowIndex - Which row
   * @returns {Array<?string>} Target identifiers, with a trailing null for the
   * empty position
   */
  function entriesFor(rowIndex) {
    const row = rows.value[rowIndex] || [];
    return row.length < rowCapacity(rowIndex) ? [...row, null] : [...row];
  }

  function currentValue(rowIndex, entryIndex) {
    return entriesFor(rowIndex)[entryIndex] ?? null;
  }

  /**
   * Whether placing this target here would be accepted. `candidatesFor` is
   * built from it, so the keyboard can never offer a placement that `place`
   * would then refuse.
   * @param {string} identifier - The target being placed
   * @param {number} rowIndex - Which row
   * @param {number} entryIndex - Which position within the row
   * @param {object} [options] - Placement context
   * @param {?number} [options.fromRow] - A row the target is being moved out
   * of, whose use is discounted. Without it a target on its last use would
   * report that it cannot be moved to a row it is about to have room in.
   * @returns {boolean} True when the placement is allowed
   */
  function placementProblem(identifier, rowIndex, entryIndex, { fromRow = null } = {}) {
    const row = rows.value[rowIndex];
    if (!row || !targets().includes(identifier)) {
      return PROBLEM.UNKNOWN;
    }
    const current = currentValue(rowIndex, entryIndex);
    if (current === identifier) {
      return PROBLEM.ALREADY_HERE;
    }
    // A directed pair is unique: a source is never paired with the same target twice
    if (row.includes(identifier)) {
      return PROBLEM.ALREADY_IN_ROW;
    }
    const movingOut =
      fromRow !== null && fromRow !== rowIndex && (rows.value[fromRow] || []).includes(identifier);
    const appending = current === null;
    if (appending && row.length >= rowCapacity(rowIndex)) {
      return PROBLEM.ROW_FULL;
    }
    if (appending && !movingOut && countPairs(rows.value) >= maxPairs()) {
      return PROBLEM.MAX_ASSOCIATIONS;
    }
    // Replacing frees the use the displaced target was holding, and so does
    // moving the target out of the row it currently sits in
    if (remainingOf(identifier) + (movingOut ? 1 : 0) <= 0) {
      return PROBLEM.NO_USES_LEFT;
    }
    return null;
  }

  function canPlace(identifier, rowIndex, entryIndex, options) {
    return placementProblem(identifier, rowIndex, entryIndex, options) === null;
  }

  /**
   * Whether this target has any legal destination left. A target can be spent
   * by its own match-max, but it can just as well be stranded by
   * max-associations or by every row already holding it, so the pool asks this
   * rather than counting uses alone.
   * @param {string} identifier - A target identifier
   * @returns {boolean} True while some entry would still accept it
   */
  function isPlaceable(identifier) {
    return rows.value.some((row, rowIndex) =>
      entriesFor(rowIndex).some((_, entryIndex) => canPlace(identifier, rowIndex, entryIndex)),
    );
  }

  function place(identifier, rowIndex, entryIndex) {
    if (!canPlace(identifier, rowIndex, entryIndex)) {
      return;
    }
    const next = rows.value;
    if (currentValue(rowIndex, entryIndex) === null) {
      next[rowIndex].push(identifier);
    } else {
      next[rowIndex][entryIndex] = identifier;
    }
    stored.value = next;
  }

  function clear(rowIndex, entryIndex) {
    const next = rows.value;
    if (!next[rowIndex] || next[rowIndex][entryIndex] === undefined) {
      return;
    }
    next[rowIndex].splice(entryIndex, 1);
    stored.value = next;
  }

  /**
   * Take a target out of a row, wherever in it the target sits.
   * @param {string} identifier - The target to take out
   * @param {number} rowIndex - The row to take it out of
   */
  function remove(identifier, rowIndex) {
    const next = rows.value;
    const entryIndex = (next[rowIndex] || []).indexOf(identifier);
    if (entryIndex === -1) {
      return;
    }
    next[rowIndex].splice(entryIndex, 1);
    stored.value = next;
  }

  function candidatesFor(rowIndex, entryIndex) {
    const current = currentValue(rowIndex, entryIndex);
    return targets().filter(
      identifier => identifier === current || canPlace(identifier, rowIndex, entryIndex),
    );
  }

  /** One directed pair per entry, ordered as the interaction's base type requires. */
  const pairs = computed(() =>
    rows.value.flatMap((row, index) => row.map(identifier => toPair(sources()[index], identifier))),
  );

  function hydrate(value) {
    const rowOf = new Map(sources().map((identifier, index) => [identifier, index]));
    const known = new Set(targets());
    const next = sources().map(() => []);

    for (const pair of Array.isArray(value) ? value : []) {
      if (!Array.isArray(pair) || pair.length !== 2) {
        continue;
      }
      const [source, target] = fromPair(pair);
      const rowIndex = rowOf.get(source);
      // Drop anything a learner could not have produced, so a malformed value
      // cannot push the rows past the limits the item declares
      if (rowIndex === undefined || !known.has(target)) {
        continue;
      }
      if (next[rowIndex].includes(target)) {
        continue;
      }
      if (next[rowIndex].length >= rowCapacity(rowIndex)) {
        continue;
      }
      if (countUses(next, target) >= targetCapacity(target)) {
        continue;
      }
      if (countPairs(next) >= maxPairs()) {
        continue;
      }
      next[rowIndex].push(target);
    }

    stored.value = next;
  }

  return {
    rows,
    pool,
    pairs,
    entriesFor,
    currentValue,
    remainingOf,
    isExhausted,
    isPlaceable,
    canPlace,
    placementProblem,
    place,
    clear,
    remove,
    candidatesFor,
    hydrate,
  };
}
