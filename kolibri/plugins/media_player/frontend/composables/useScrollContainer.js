import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Finds the nearest scrollable ancestor of the given element.
 * Walks up the DOM tree looking for the first ancestor with overflow-y: auto or scroll.
 * Falls back to the document element if no scrollable ancestor is found.
 * @param {Element} el - Element to start the search from
 * @returns {Element} Nearest scrollable ancestor, or the document element
 */
function findScrollableAncestor(el) {
  let current = el.parentElement;
  while (current && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }
  return document.documentElement;
}

/**
 * Composable that detects the nearest scrollable ancestor of an element
 * and tracks its viewport position. Useful for positioning fixed elements
 * (like the audio sticky player) relative to a scroll container without
 * coupling to any specific layout context.
 *
 * The container rect is only recalculated when:
 * - The component mounts
 * - The window resizes
 * - The container's size changes (via ResizeObserver)
 * @typedef {object} ContainerRect
 * @typedef {object} ScrollContainerApi
 * @param {import('vue').Ref<HTMLElement>} elementRef - Ref to the DOM element to start from
 * @property {number} top Distance from viewport top to the container's visible top.
 * @property {number} bottom Distance from viewport top to the container's visible bottom.
 * @property {number} left Distance from viewport left to the container's left edge.
 * @property {number} width Container width in pixels.
 * @property {import('vue').Ref<ContainerRect>} containerRect Reactive rect of the
 * nearest scrollable ancestor, clamped to the viewport.
 * @property {() => void} updateRect Force a recalculation of containerRect (useful
 * when layout changes outside of resize/ResizeObserver triggers).
 * @returns {ScrollContainerApi}
 */
export default function useScrollContainer(elementRef) {
  const containerRect = ref({ top: 0, bottom: 0, left: 0, width: 0 });

  let scrollContainer = null;
  let resizeObserver = null;

  function updateRect() {
    if (!scrollContainer) return;

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
    if (!elementRef.value) return;

    scrollContainer = findScrollableAncestor(elementRef.value);
    updateRect();

    window.addEventListener('resize', updateRect);

    if (typeof ResizeObserver !== 'undefined' && scrollContainer !== document.documentElement) {
      resizeObserver = new ResizeObserver(updateRect);
      resizeObserver.observe(scrollContainer);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateRect);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

  return { containerRect, updateRect };
}
