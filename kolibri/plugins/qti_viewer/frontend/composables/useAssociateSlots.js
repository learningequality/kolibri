import { computed, ref, unref } from 'vue';

const SLOTS_PER_ROW = 2;

function emptyRow() {
  return new Array(SLOTS_PER_ROW).fill(null);
}

// Find where an identifier is in the slots
function locate(rows, identifier) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const side = rows[rowIndex].indexOf(identifier);
    if (side !== -1) {
      return [rowIndex, side];
    }
  }
  return null;
}

export default function useAssociateSlots(identifiers, rowCount) {
  const stored = ref([]);

  // Normalise on read rather than resizing on change
  const slots = computed(() =>
    Array.from({ length: unref(rowCount) }, (_, index) =>
      stored.value[index] ? [...stored.value[index]] : emptyRow(),
    ),
  );

  const placed = computed(() => new Set(slots.value.flat().filter(Boolean)));

  const pool = computed(() => unref(identifiers).filter(id => !placed.value.has(id)));

  const pairs = computed(() => slots.value.filter(row => row.every(Boolean)));

  function place(identifier, rowIndex, side) {
    const next = slots.value;
    const displaced = next[rowIndex]?.[side];
    // Out of range, or the response is already where it is being put
    if (displaced === undefined || displaced === identifier) {
      return;
    }
    const origin = locate(next, identifier);
    next[rowIndex][side] = identifier;
    if (origin) {
      next[origin[0]][origin[1]] = displaced;
    }
    // A response arriving from the pool displaces its predecessor back to the
    // pool implicitly, since the pool is whatever is not in a slot.
    stored.value = next;
  }

  function clear(rowIndex, side) {
    const next = slots.value;
    if (!next[rowIndex]) {
      return;
    }
    next[rowIndex][side] = null;
    stored.value = next;
  }

  // Send a response back to the pool, wherever it currently sits
  function remove(identifier) {
    const next = slots.value;
    const origin = locate(next, identifier);
    if (!origin) {
      return;
    }
    next[origin[0]][origin[1]] = null;
    stored.value = next;
  }

  function candidatesFor(rowIndex, side) {
    const current = slots.value[rowIndex]?.[side] ?? null;
    // The slot's own response stays a candidate so the candidate can step past
    // it and back again without losing their answer.
    return unref(identifiers).filter(id => !placed.value.has(id) || id === current);
  }

  function hydrate(value) {
    const known = new Set(unref(identifiers));
    const next = [];
    const used = new Set();

    for (const pair of Array.isArray(value) ? value : []) {
      if (next.length >= unref(rowCount)) {
        break;
      }
      // Skip any pair that is not an array of the right length, or contains
      // identifiers that are not known or already used.
      if (!Array.isArray(pair) || pair.length !== SLOTS_PER_ROW) {
        continue;
      }
      if (pair.some(id => !known.has(id) || used.has(id))) {
        continue;
      }
      pair.forEach(id => used.add(id));
      next.push([...pair]);
    }

    stored.value = next;
  }

  return {
    slots,
    pool,
    pairs,
    place,
    clear,
    remove,
    candidatesFor,
    hydrate,
  };
}
