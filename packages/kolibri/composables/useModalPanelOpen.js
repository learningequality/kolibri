import { computed, ref, watch } from 'vue';
import { toValue, unrefElement, useMutationObserver } from '@vueuse/core';

const MODAL = '[aria-modal="true"]';

export default function useModalPanelOpen(container, active) {
  const modalFound = ref(false);
  const target = computed(() => (toValue(active) ? unrefElement(container) : null));

  function update() {
    const element = target.value;
    modalFound.value = element instanceof Element && Boolean(element.querySelector(MODAL));
  }

  useMutationObserver(target, update, { childList: true, subtree: true });
  watch(target, update, { flush: 'post' });

  return computed(() => Boolean(target.value) && modalFound.value);
}
