import { ref, computed, onMounted } from 'vue';
import { useEventListener, useResizeObserver } from '@vueuse/core';

/**
 * Finds a scrollable ancestor of the given element.
 *
 * Walks up the DOM tree looking for ancestors with overflow-y auto/scroll,
 * stopping at the document element. The `strategy` picks which match to
 * return:
 * - `'nearest'` — the first scrollable ancestor (default). Correct when the
 *   element sits directly inside the region you want to position against.
 * - `'outermost'` — the last scrollable ancestor before the document element.
 *   Correct when the content is wrapped in inner scrollable cards (e.g.
 *   KPageContainer's overflow-y: auto) that scroll *within* the real layout
 *   viewport; it's that outer, viewport-fixed region we want.
 *
 * Falls back to the document element if there is no scrollable ancestor.
 * @param {HTMLElement} el - Start point to search upward from
 * @param {'nearest'|'outermost'} strategy - Which scrollable ancestor to pick
 * @returns {HTMLElement} Matching scrollable ancestor, or the document element
 */
function findScrollableAncestor(el, strategy) {
  let current = el.parentElement;
  let outermost = null;
  while (current && current !== document.documentElement) {
    const overflowY = getComputedStyle(current).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      if (strategy === 'nearest') {
        return current;
      }
      outermost = current;
    }
    current = current.parentElement;
  }
  return outermost || document.documentElement;
}

/**
 * Composable that detects a scrollable ancestor of an element and tracks its
 * viewport position. Useful for positioning fixed elements (like the numeric
 * keypad or the audio sticky player) relative to a scroll container without
 * coupling to any specific layout context. Pass `strategy` to pick the nearest
 * (default) or outermost scrollable ancestor — see findScrollableAncestor.
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
 * @param {object} [options] - Optional configuration
 * @param {'nearest'|'outermost'} [options.strategy] - Which scrollable ancestor
 * to track (default `'nearest'`)
 * @property {number} top Distance from viewport top to the container's visible top.
 * @property {number} bottom Distance from viewport top to the container's visible bottom.
 * @property {number} left Distance from viewport left to the container's left edge.
 * @property {number} width Container width in pixels.
 * @property {import('vue').Ref<ContainerRect>} containerRect Reactive rect of the
 * detected scrollable ancestor, clamped to the viewport.
 * @property {() => void} updateRect Force a re-detection and recalculation of
 * containerRect (useful when layout changes outside of resize/ResizeObserver).
 * @returns {ScrollContainerApi} Reactive container rect and an updateRect trigger
 */
export default function useScrollContainer(elementRef, { strategy = 'nearest' } = {}) {
  const containerRect = ref({ top: 0, bottom: 0, left: 0, width: 0 });

  const scrollContainer = ref(null);

  function updateRect() {
    if (!elementRef.value) {
      return;
    }

    scrollContainer.value = findScrollableAncestor(elementRef.value, strategy);

    if (scrollContainer.value === document.documentElement) {
      // If the scroll container is the document itself, the content viewport
      // starts at the top of the visible area
      containerRect.value = {
        top: 0,
        bottom: window.innerHeight,
        left: 0,
        width: window.innerWidth,
      };
    } else {
      const rect = scrollContainer.value.getBoundingClientRect();
      containerRect.value = {
        top: Math.max(0, rect.top),
        bottom: Math.min(window.innerHeight, rect.bottom),
        left: rect.left,
        width: rect.width,
      };
    }
  }

  onMounted(updateRect);

  // The document element resizes with the window, so observing it via
  // ResizeObserver is redundant — the window resize listener covers that case.
  const observedContainer = computed(() =>
    scrollContainer.value === document.documentElement ? null : scrollContainer.value,
  );

  // Both auto-dispose on scope unmount; useResizeObserver no-ops when the
  // ResizeObserver API is unavailable or the target is null.
  useEventListener(window, 'resize', updateRect);
  useResizeObserver(observedContainer, updateRect);

  return { containerRect, updateRect };
}
