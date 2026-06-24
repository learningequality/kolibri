import uniq from 'lodash/uniq';
import { isRef, ref, computed } from 'vue';

/**
 * Manage expand/collapse state for an accordion-style list of items.
 * @param {import('vue').Ref<Array>} items - A reactive ref whose value is the list of
 * accordion items. Required and must be a Vue ref so that the composable can react to
 * changes in the underlying list.
 * @returns {{
 *   canExpandAll: import('vue').ComputedRef<boolean>,
 *   canCollapseAll: import('vue').ComputedRef<boolean>,
 *   collapse: (index: number) => void,
 *   collapseAll: () => void,
 *   expand: (index: number) => void,
 *   expandAll: () => void,
 *   isExpanded: (index: number) => boolean,
 *   toggle: (index: number) => void,
 * }} The accordion state and the actions for mutating it.
 * @throws {Error} If `items` is not a Vue ref.
 */
export default function useAccordion(items) {
  if (!isRef(items)) {
    throw new Error('items is required and must be reactive value');
  }

  const _expandedIndexes = ref([]);

  function toggle(index) {
    if (_expandedIndexes.value.includes(index)) {
      collapse(index);
    } else {
      expand(index);
    }
  }

  function expand(index) {
    _expandedIndexes.value = uniq([..._expandedIndexes.value, index]);
  }

  function collapse(index) {
    _expandedIndexes.value = _expandedIndexes.value.filter(i => i !== index);
  }

  function collapseAll() {
    _expandedIndexes.value = [];
  }

  function expandAll() {
    _expandedIndexes.value = items.value.map((_, i) => i);
  }

  function isExpanded(index) {
    return _expandedIndexes.value.includes(index);
  }

  const canExpandAll = computed(() => {
    return items.value.length !== _expandedIndexes.value.length;
  });

  const canCollapseAll = computed(() => {
    return _expandedIndexes.value.length > 0;
  });

  return {
    canExpandAll,
    canCollapseAll,
    collapse,
    collapseAll,
    expand,
    expandAll,
    isExpanded,
    toggle,
  };
}
