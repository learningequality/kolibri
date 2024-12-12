import uniq from 'lodash/uniq';
import { ref, computed, provide, inject } from 'vue';

export default function useAccordion() {
  const _items = ref([]);
  const _expandedItems = ref([]);

  function registerItem(uid) {
    _items.value.push(uid);
  }

  function unregisterItem(uid) {
    _items.value = _items.value.filter(v => v !== uid);
    _expandedItems.value = _expandedItems.value.filter(v => v !== uid);
  }

  function toggle(uid) {
    if (_expandedItems.value.includes(uid)) {
      collapse(uid);
    } else {
      expand(uid);
    }
  }

  function expand(uid) {
    _expandedItems.value = uniq([..._expandedItems.value, uid]);
  }

  function collapse(uid) {
    _expandedItems.value = _expandedItems.value.filter(value => value !== uid);
  }

  function collapseAll() {
    _expandedItems.value = [];
  }

  function expandAll() {
    _expandedItems.value = [..._items.value];
  }

  function isExpanded(uid) {
    return _expandedItems.value.includes(uid);
  }

  const canExpandAll = computed(() => {
    return _items.value.length !== _expandedItems.value.length;
  });

  const canCollapseAll = computed(() => {
    return _expandedItems.value.length > 0;
  });

  provide('accordion_registerItem', registerItem);
  provide('accordion_unregisterItem', unregisterItem);
  provide('accordion_toggle', toggle);
  provide('accordion_isExpanded', isExpanded);

  return {
    canExpandAll,
    canCollapseAll,
    collapseAll,
    expandAll,
  };
}

export function injectAccordionItem(uid) {
  const _registerItem = inject('accordion_registerItem');
  function registerItem() {
    return _registerItem(uid);
  }

  const _unregisterItem = inject('accordion_unregisterItem');
  function unregisterItem() {
    return _unregisterItem(uid);
  }

  const _toggle = inject('accordion_toggle');
  function toggle() {
    return _toggle(uid);
  }

  const _isExpanded = inject('accordion_isExpanded');
  const isExpanded = computed(() => _isExpanded(uid));

  return {
    registerItem,
    unregisterItem,
    toggle,
    isExpanded,
  };
}
