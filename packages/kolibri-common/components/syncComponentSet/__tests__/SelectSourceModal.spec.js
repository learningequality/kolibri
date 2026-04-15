import { render, fireEvent, screen } from '@testing-library/vue';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { syncStrings } from 'kolibri-common/mixins/commonSyncElements';
import SelectSourceModal from '../SelectSourceModal.vue';

const renderComponent = props => {
  return render(SelectSourceModal, {
    props,
  });
};

describe('SelectSourceModal', () => {
  it('renders the correct default body and button labels', async () => {
    renderComponent();

    expect(screen.getByText(syncStrings.selectSourceTitle$())).toBeInTheDocument();
    expect(screen.getByRole('button', { name: coreString('continueAction') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: coreString('cancelAction') })).toBeInTheDocument();
  });

  it('clicking the Continue button emits the submit event', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: coreString('continueAction') }));

    expect(emitted()).toHaveProperty('submit');
    expect(emitted().submit).toHaveLength(1);
  });

  it('clicking the Cancel button emits the cancel event', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: coreString('cancelAction') }));

    expect(emitted()).toHaveProperty('cancel');
    expect(emitted().cancel).toHaveLength(1);
  });

  it('displays the loading message when showLoadingMessage is true', async () => {
    renderComponent({ showLoadingMessage: true });
    expect(screen.getByText(SelectSourceModal.$trs.loadingMessage.message)).toBeInTheDocument();
  });

  it('the submit button is disabled when the submitDisabled prop is true', async () => {
    renderComponent({ submitDisabled: true });
    expect(screen.getByRole('button', { name: coreString('continueAction') })).toBeDisabled();
  });
});
