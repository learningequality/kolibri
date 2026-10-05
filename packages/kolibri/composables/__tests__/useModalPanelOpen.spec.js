import { nextTick, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import useModalPanelOpen from '../useModalPanelOpen';

function renderPage({ active, showModal }) {
  return render({
    setup() {
      const container = ref(null);
      const modalPanelOpen = useModalPanelOpen(container, active);
      return { container, modalPanelOpen, showModal };
    },
    template: `
      <div>
        <div ref="container">
          <section v-if="showModal" role="dialog" aria-modal="true" />
        </div>
        <span data-testid="modal-panel-open">{{ modalPanelOpen }}</span>
      </div>
    `,
  });
}

describe('useModalPanelOpen', () => {
  it('reports no modal panel while inactive, even with one in the container', async () => {
    const active = ref(false);
    renderPage({ active, showModal: ref(true) });
    await nextTick();
    expect(screen.getByTestId('modal-panel-open')).toHaveTextContent('false');

    active.value = true;
    await nextTick();
    await nextTick();
    expect(screen.getByTestId('modal-panel-open')).toHaveTextContent('true');
  });

  it('detects a modal panel added and removed while active', async () => {
    const showModal = ref(false);
    renderPage({ active: ref(true), showModal });
    await nextTick();
    expect(screen.getByTestId('modal-panel-open')).toHaveTextContent('false');

    showModal.value = true;
    await nextTick();
    await nextTick();
    expect(screen.getByTestId('modal-panel-open')).toHaveTextContent('true');

    showModal.value = false;
    await nextTick();
    await nextTick();
    expect(screen.getByTestId('modal-panel-open')).toHaveTextContent('false');
  });
});
