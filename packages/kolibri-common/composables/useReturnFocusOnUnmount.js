import { onBeforeMount, onUnmounted } from 'vue';
import { focusPageHeading } from 'kolibri/composables/usePageTitle';

/**
 * A composable that saves the currently focused element on mount
 * and returns focus to that element on unmount.
 */
export default function useReturnFocusOnUnmount() {
  let lastFocus = null;

  onBeforeMount(() => {
    lastFocus = document.activeElement;
  });

  onUnmounted(() => {
    setTimeout(() => {
      if (document.activeElement !== document.body) {
        return;
      }
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
      if (document.activeElement === document.body) {
        focusPageHeading();
      }
    });
  });
}
