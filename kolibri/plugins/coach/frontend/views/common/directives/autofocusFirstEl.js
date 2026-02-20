import { nextTick } from 'vue';
import { getFirstFocusableElement } from 'kolibri-common/utils/focusUtils';

export default {
  async inserted(el, binding) {
    if (binding.value === false) {
      return;
    }
    // Some KDS components like KBreadcrumbs needs at least 2 ticks to be properly rendered
    await nextTick();
    await nextTick();
    const firstFocusableElement = getFirstFocusableElement(el);
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    }
  },
};
