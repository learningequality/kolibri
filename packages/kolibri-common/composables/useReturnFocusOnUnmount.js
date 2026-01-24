import { onBeforeMount, onUnmounted } from 'vue';

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
    if (lastFocus && typeof lastFocus.focus === 'function') {
      setTimeout(() => {
        lastFocus.focus();
      });
    }
  });
}
