/**
 * What to tell a learner about the placements an interaction built on
 * `useMatchRows` refuses. A refusal is otherwise silent: the response simply
 * stays where it was, with nothing to say which of the item's limits stopped it.
 * @module usePlacementNotice
 */
import { computed, ref, unref, watch } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import { PROBLEM } from './useMatchRows';

export const placementNoticeStrings = createTranslator('PlacementNoticeStrings', {
  refusedAlreadyInRow: {
    message: '{response} is already matched with {source}.',
    context:
      'Explains why a response the learner tried to place was not accepted: that pairing already exists',
  },
  refusedRowFull: {
    message: '{source} already has as many responses as it can take.',
    context:
      'Explains why a response the learner tried to place was not accepted: the item being matched has reached its limit',
  },
  refusedNoUsesLeft: {
    message: '{response} has already been matched as many times as it can be.',
    context:
      'Explains why a response the learner tried to place was not accepted: that response has reached its own limit',
  },
  refusedMaxAssociations: {
    message:
      'You can make {count, number} {count, plural, one {match} other {matches}} in this question. Remove one to make a different match.',
    context:
      'Explains why a response the learner tried to place was not accepted: the question has a limit on the total number of matches',
  },
});

const { refusedAlreadyInRow$, refusedRowFull$, refusedNoUsesLeft$, refusedMaxAssociations$ } =
  placementNoticeStrings;

/**
 * The explanation for a problem `useMatchRows` reported.
 * @param {string} problem - One of {@link PROBLEM}
 * @param {object} labels - How the learner sees the two ends of the placement
 * @param {string} labels.response - The response being placed
 * @param {string} [labels.source] - What it was being matched with
 * @returns {?string} The message, or null for a problem not worth interrupting
 * a learner over
 */
export function explain(problem, { response, source }) {
  if (problem === PROBLEM.ALREADY_IN_ROW) {
    return refusedAlreadyInRow$({ response, source });
  }
  if (problem === PROBLEM.ROW_FULL) {
    return refusedRowFull$({ source });
  }
  if (problem === PROBLEM.NO_USES_LEFT) {
    return refusedNoUsesLeft$({ response });
  }
  // MAX_ASSOCIATIONS has a standing notice of its own; ALREADY_HERE and UNKNOWN
  // are not worth interrupting a learner over
  return null;
}

/**
 * Track the notice to show a learner about the placements they are making, and
 * provide operations to set it.
 * @param {object} options - The interaction's answer and limits
 * @param {import('vue').Ref<Array>} options.pairs - The pairs made so far
 * @param {import('vue').Ref<number>} options.maxAssociations - Cap on the total
 * number of pairs, where 0 means no limit
 * @param {import('vue').Ref<number>|number} [options.capacity] - The most pairs
 * the interaction could hold without the cap. A cap no lower than this never
 * stops a placement, so reaching it is not worth a notice.
 * @param {import('vue').Ref<boolean>} options.interactive - Whether the learner
 * can still change the answer
 * @returns {object} The notice to show, and the operations that set it
 */
export default function usePlacementNotice({
  pairs,
  maxAssociations,
  capacity = Infinity,
  interactive,
}) {
  const refusal = ref(null);

  /**
   * Explain why the attempt just made was not accepted.
   * @param {?string} message - The explanation, or null to explain nothing
   */
  function refuse(message) {
    refusal.value = message;
  }

  function accept() {
    refusal.value = null;
  }

  // A refusal explains one attempt, not the state of the question: once the
  // pairs change the learner has moved on and it is stale.
  watch(pairs, accept);
  watch(interactive, accept);

  const atMaxAssociations = computed(() => {
    const max = unref(maxAssociations);
    return max > 0 && max < unref(capacity) && pairs.value.length >= max;
  });

  // A refusal is about what the learner just did, so it wins while it stands
  const notice = computed(() => {
    if (refusal.value) {
      return refusal.value;
    }
    return atMaxAssociations.value
      ? refusedMaxAssociations$({ count: unref(maxAssociations) })
      : null;
  });

  return { notice, refuse, accept };
}
