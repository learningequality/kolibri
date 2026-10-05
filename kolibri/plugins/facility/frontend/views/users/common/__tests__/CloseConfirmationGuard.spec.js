import { fireEvent, render, screen } from '@testing-library/vue';
import SidePanelModal from 'kolibri-common/components/SidePanelModal';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import CloseConfirmationGuard from '../CloseConfirmationGuard';

const LEAVE = 'Leave';

const PanelWithGuard = {
  render(h) {
    return h(SidePanelModal, { props: { alignment: 'right' } }, [
      h(CloseConfirmationGuard, { ref: 'guard', props: { hasUnsavedChanges: true } }),
      h(
        'button',
        { on: { click: () => this.$refs.guard.beforeRouteLeave({}, {}, () => {}) } },
        LEAVE,
      ),
    ]);
  },
};

describe('CloseConfirmationGuard', () => {
  it('shows the unsaved-changes confirmation inside the modal side panel', async () => {
    render(PanelWithGuard, { routes: [] });
    await fireEvent.click(screen.getByRole('button', { name: LEAVE }));

    const confirmation = await screen.findByRole('dialog', {
      name: coreStrings.closeConfirmationTitle$(),
    });
    expect(confirmation.parentElement.closest('[aria-modal="true"]')).toBeInTheDocument();
  });
});
