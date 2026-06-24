import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Finds the outermost scrollable ancestor of the given element.
 *
 * Walks up the DOM tree and returns the *last* ancestor with overflow-y
 * auto/scroll before reaching the document element. We want the outermost
 * rather than the nearest because the content is often wrapped in inner
 * scrollable cards (e.g. KPageContainer's overflow-y: auto) that scroll
 * within* the real layout viewport; it's that outer, viewport-fixed region
 * we want to position against. Falls back to the document element if there is
 * no scrollable ancestor.
 *
 * NB: this diverges from the media_player copy of this composable, which
 * returns the nearest scrollable ancestor — the Perseus content has an
 * intermediate scrollable card that the media player layout does not.
 * @param {HTMLElement} el - Start point to search upward from
 * @returns {HTMLElement} Outermost scrollable ancestor, or the document element
 */
function findScrollableAncestor(el) {
  let current = el.parentElement;
  let outermost = null;
  while (current && current !== document.documentElement) {
    const overflowY = getComputedStyle(current).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      outermost = current;
    }
    current = current.parentElement;
  }
  return outermost || document.documentElement;
}

/**
 * Composable that detects the outermost scrollable ancestor of an element
 * and tracks its viewport position. Useful for positioning fixed elements
 * (like the numeric keypad) relative to a scroll container without coupling
 * to any specific layout context.
 *
 * The container is (re)detected and its rect recalculated when:
 * - The component mounts
 * - The window resizes
 * - The container's size changes (via ResizeObserver)
 * - `updateRect()` is called explicitly (e.g. when the consumer becomes visible)
 *
 * Re-detecting on every update keeps the result correct even if the relevant
 * ancestor styles are applied after mount.
 * @typedef {object} ContainerRect
 * @typedef {object} ScrollContainerApi
 * @param {import('vue').Ref<HTMLElement>} elementRef - Ref to the DOM element to start from
 * @property {number} top Distance from viewport top to the container's visible top.
 * @property {number} bottom Distance from viewport top to the container's visible bottom.
 * @property {number} left Distance from viewport left to the container's left edge.
 * @property {number} width Container width in pixels.
 * @property {import('vue').Ref<ContainerRect>} containerRect Reactive rect of the
 * outermost scrollable ancestor, clamped to the viewport.
 * @property {() => void} updateRect Force a re-detection and recalculation of
 * containerRect (useful when layout changes outside of resize/ResizeObserver).
 * @returns {ScrollContainerApi} Reactive container rect and an updateRect trigger
 */
export default function useScrollContainer(elementRef) {
  const containerRect = ref({ top: 0, bottom: 0, left: 0, width: 0 });

  let scrollContainer = null;
  let resizeObserver = null;

  function observe(container) {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (
      typeof ResizeObserver !== 'undefined' &&
      container &&
      container !== document.documentElement
    ) {
      resizeObserver = new ResizeObserver(updateRect);
      resizeObserver.observe(container);
    }
  }

  function updateRect() {
    if (!elementRef.value) {
      return;
    }

    const detected = findScrollableAncestor(elementRef.value);
    if (detected !== scrollContainer) {
      scrollContainer = detected;
      observe(scrollContainer);
    }

    if (scrollContainer === document.documentElement) {
      // If the scroll container is the document itself, the content viewport
      // starts at the top of the visible area
      containerRect.value = {
        top: 0,
        bottom: window.innerHeight,
        left: 0,
        width: window.innerWidth,
      };
    } else {
      const rect = scrollContainer.getBoundingClientRect();
      containerRect.value = {
        top: Math.max(0, rect.top),
        bottom: Math.min(window.innerHeight, rect.bottom),
        left: rect.left,
        width: rect.width,
      };
    }
  }

  onMounted(() => {
    if (!elementRef.value) {
      return;
    }
    updateRect();
    window.addEventListener('resize', updateRect);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateRect);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

  return { containerRect, updateRect };
}
