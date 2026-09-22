import { computed } from 'vue';

export function validateTally(value) {
  return (
    Number.isInteger(value.started) &&
    Number.isInteger(value.notStarted) &&
    Number.isInteger(value.completed) &&
    (value.helpNeeded === undefined || Number.isInteger(value.helpNeeded))
  );
}

// Every learner should be tallied into one and only one status.
export const tallyProp = {
  type: Object,
  required: true,
  validator: validateTally,
};

/**
 * Derive learner status counts from a reactive tally ref.
 * @param {import('vue').Ref<object>} tally - Reactive learner status tally.
 * @returns {object} Computed status counts and their total.
 */
export default function useTally(tally) {
  const started = computed(() => tally.value.started);
  const completed = computed(() => tally.value.completed);
  const notStarted = computed(() => tally.value.notStarted);
  const helpNeeded = computed(() => tally.value.helpNeeded || 0);
  const total = computed(
    () => started.value + completed.value + notStarted.value + helpNeeded.value,
  );

  return { started, completed, notStarted, helpNeeded, total };
}
