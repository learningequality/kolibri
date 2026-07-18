import { computed, ref, watch } from 'vue';

/**
 * Extract Kolibri hint bodies from a parsed QTI item document.
 *
 * A hint is any `qti-card[support="ext:kolibri-hint"]` inside `qti-catalog-info`.
 * Its body is the innerHTML of its first `qti-html-content`, in document order.
 * @param {Document|null} xmlDoc - parsed QTI item document
 * @returns {string[]} hint HTML strings in document order; `[]` when none
 */
function parseHints(xmlDoc) {
  if (!xmlDoc) {
    return [];
  }
  const cards = xmlDoc.querySelectorAll('qti-catalog-info qti-card[support="ext:kolibri-hint"]');
  return Array.from(cards)
    .map(card => {
      const content = card.querySelector('qti-html-content');
      return content ? content.innerHTML : null;
    })
    .filter(html => html !== null);
}

/**
 * Progressive-reveal hint state for a QTI item.
 *
 * Mirrors the public hint contract of the Perseus renderer: `totalHints`,
 * `availableHints`, and a `takeHint()` method. Revealed hints reset whenever the
 * source document changes.
 * @param {import('vue').Ref<Document|null>} xmlDoc - parsed QTI item document
 * @returns {object} `totalHints`, `availableHints`, `revealedHints`, `takeHint`
 */
export default function useHints(xmlDoc) {
  const hints = computed(() => parseHints(xmlDoc.value));
  const hintsVisible = ref(0);

  const totalHints = computed(() => hints.value.length);
  const availableHints = computed(() => totalHints.value - hintsVisible.value);
  const revealedHints = computed(() => hints.value.slice(0, hintsVisible.value));

  watch(xmlDoc, () => {
    hintsVisible.value = 0;
  });

  function takeHint() {
    if (hintsVisible.value < totalHints.value) {
      hintsVisible.value += 1;
      return true;
    }
    return false;
  }

  return {
    totalHints,
    availableHints,
    revealedHints,
    takeHint,
  };
}
