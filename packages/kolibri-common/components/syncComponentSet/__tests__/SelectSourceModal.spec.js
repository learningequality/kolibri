import { render, fireEvent, screen } from '@testing-library/vue';
import SelectSourceModal from '../SelectSourceModal.vue';

const renderComponent = props => {
  return render(SelectSourceModal, {
    props,
  });
};

describe('SelectSourceModal', () => {
  it('renders the correct default body and button labels', async () => {
    renderComponent();

    expect(screen.getByText('Select a source')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('clicking the Continue button emits the submit event', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(emitted()).toHaveProperty('submit');
    expect(emitted().submit).toHaveLength(1);
  });

  it('clicking the Cancel button emits the cancel event', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(emitted()).toHaveProperty('cancel');
    expect(emitted().cancel).toHaveLength(1);
  });

  it('displays the loading message when showLoadingMessage is true', async () => {
    renderComponent({ showLoadingMessage: true });
    expect(screen.getByText('Loading connections…')).toBeInTheDocument();
  });

  it('the submit button is disabled when the submitDisabled prop is true', async () => {
    renderComponent({ submitDisabled: true });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
