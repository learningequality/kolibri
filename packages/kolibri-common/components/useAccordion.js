import uniq from 'lodash/uniq';
import { isRef, ref, computed } from 'vue';

/**
 * @param {Object} options
 * @param {Array<Ref>} options.items - array of items in accordion
 * @param {Function: int => bool} options.collapseGuard - function to determine if collapse is
 *    allowed - when true, collapse is blocked
 * @param {Function: int => bool} options.expandGuard - function to determine if expand is allowed
 *  - when true, expand is blocked
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

/**
 * <KAccordion>
 *   <KAccordionItem
 *      v-for="(item, index) in items"
 *      :isExpanded="isExpanded(index)"
 *   >
 *      <template #heading>
 *        <h3 @click="toggle(index)">{{ item.title }}</h3>
 *      </template>
 *      <template #content>
 *        <p v-if="isExpanded(index)">{{ item.content }}</p>
 *      </template>
 *   </KAccordionItem>
 * </KAccordion>
 */
