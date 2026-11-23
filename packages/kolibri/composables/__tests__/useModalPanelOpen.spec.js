import { nextTick, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import useModalPanelOpen from '../useModalPanelOpen';

function renderPage({ active, showModal }) {
  let modalPanelOpen;
  render({
    setup() {
      const container = ref(null);
      modalPanelOpen = useModalPanelOpen(container, active);
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
  return modalPanelOpen;
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

  it('stops reporting a modal panel as soon as it goes inactive', async () => {
    const active = ref(true);
    const modalPanelOpen = renderPage({ active, showModal: ref(true) });
    await nextTick();
    await nextTick();
    expect(modalPanelOpen.value).toBe(true);

    active.value = false;
    expect(modalPanelOpen.value).toBe(false);
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
