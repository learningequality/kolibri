import { computed, ref, watch } from 'vue';
import { toValue, unrefElement, useMutationObserver } from '@vueuse/core';

const MODAL = '[aria-modal="true"]';

/**
 * Tracks whether a container is or holds an `aria-modal` element.
 * @param {import('vue').Ref} container - An element or component ref.
 * @param {import('vue').MaybeRefOrGetter<boolean>} active - Observe the container only while true.
 * @returns {import('vue').Ref<boolean>} Always false while `active` is false.
 */
export default function useModalPanelOpen(container, active) {
  const modalPanelOpen = ref(false);
  const target = computed(() => (toValue(active) ? unrefElement(container) : null));

  function update() {
    const element = target.value;
    modalPanelOpen.value =
      element instanceof Element &&
      (element.matches(MODAL) || Boolean(element.querySelector(MODAL)));
  }

  useMutationObserver(target, update, { childList: true, subtree: true });
  watch(target, update, { flush: 'post' });

  return modalPanelOpen;
}
