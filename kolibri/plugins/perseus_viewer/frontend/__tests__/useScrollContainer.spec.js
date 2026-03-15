import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import useScrollContainer from '../composables/useScrollContainer';

// Mounts a harness modelling the Perseus DOM: an outer scroll viewport
// (like .column-pane) wrapping an inner scrollable card (like KPageContainer)
// wrapping the element handed to the composable.
function mountHarness({ outerStyle = '', innerStyle = '' } = {}) {
  let api;
  const Harness = {
    template: `
      <div>
        <div data-testid="outer" :style="outerStyle">
          <div data-testid="inner" :style="innerStyle">
            <div>
              <div data-testid="target" ref="target"></div>
            </div>
          </div>
        </div>
      </div>
    `,
    setup() {
      const target = ref(null);
      api = useScrollContainer(target);
      return { target, outerStyle, innerStyle };
    },
  };
  render(Harness);
  return api;
}

function stubRect(el, rect) {
  el.getBoundingClientRect = () => rect;
}

describe('useScrollContainer', () => {
  it('pins to the outermost scrollable ancestor, skipping inner scrollable cards', () => {
    // Both the outer viewport and the inner card are scrollable. The inner card
    // (KPageContainer) scrolls *within* the outer viewport, so we must select
    // the outer one — selecting the inner one was the keypad positioning bug.
    const api = mountHarness({ outerStyle: 'overflow-y: auto;', innerStyle: 'overflow-y: auto;' });
    stubRect(screen.getByTestId('outer'), { top: 64, bottom: 500, left: 16, width: 400 });
    stubRect(screen.getByTestId('inner'), { top: 64, bottom: 900, left: 16, width: 380 });

    api.updateRect();

    expect(api.containerRect.value).toEqual({ top: 64, bottom: 500, left: 16, width: 400 });
  });

  it('clamps the container rect to the viewport', () => {
    const api = mountHarness({ outerStyle: 'overflow-y: auto;' });
    // Extends above the viewport top and below its bottom.
    stubRect(screen.getByTestId('outer'), {
      top: -50,
      bottom: window.innerHeight + 200,
      left: 16,
      width: 400,
    });

    api.updateRect();

    expect(api.containerRect.value).toEqual({
      top: 0,
      bottom: window.innerHeight,
      left: 16,
      width: 400,
    });
  });

  it('falls back to the document element when no scrollable ancestor exists', () => {
    // This is the case the old keypad logic got wrong (it returned null and
    // silently pinned to the perseus root).
    const api = mountHarness();

    expect(api.containerRect.value).toEqual({
      top: 0,
      bottom: window.innerHeight,
      left: 0,
      width: window.innerWidth,
    });
  });
});
