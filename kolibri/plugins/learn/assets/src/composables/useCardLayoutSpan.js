import { get } from '@vueuse/core';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { computed } from 'vue';

export default function useCardLayoutSpan() {
  const { windowBreakpoint, windowIsSmall } = useKResponsiveWindow();
  const cardsPerRow = computed(() => {
    if (get(windowIsSmall)) {
      return 1;
    }
    if (get(windowBreakpoint) < 3) {
      return 2;
    }
    if (get(windowBreakpoint) < 7) {
      return 3;
    }
    return 4;
  });
  const layoutSpan = computed(() => {
    /**
     * The breakpoints below represent the window widths
     * 0: < 480px  | Small screen  | 4 columns
     * 1: < 600px  | Small screen  | 4 columns
     * 2: < 840px  | Medium screen | 8 columns
     * 3: < 960px  | Large screen  | 12 columns
     * 4: < 1280px | Large screen  | 12 columns
     * 5: < 1440px | Large screen  | 12 columns
     * 6: < 1600px | Large screen  | 12 columns
     * 7: > 1600px | Large screen  | 12 columns
     *
     * On resize, display X cards per row where:
     * X = total columns in grid / column span for each card.
     * For example, if the total number of columns is 12, and
     * column span for each cards is 4, then X is 3.
     */
    if (get(windowBreakpoint) < 2) {
      return 4 / get(cardsPerRow);
    }
    if (get(windowBreakpoint) === 2) {
      return 8 / get(cardsPerRow);
    }
    return 12 / get(cardsPerRow);
  });

  function makeComputedCardCount(rows, minCards) {
    // We want to display the number of rows specified by rows,
    // but always display at least minCards cards, if available.
    return computed(() => {
      const numCards = Math.max(get(cardsPerRow) * rows, minCards);
      // Now to make sure we don't display incomplete rows, we round this number up
      // to the nearest multiple of cardsPerRow
      return Math.ceil(numCards / get(cardsPerRow)) * get(cardsPerRow);
    });
  }

  return {
    layoutSpan,
    makeComputedCardCount,
  };
}
