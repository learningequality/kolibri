import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import RegenerateQRModal from '../RegenerateQRModal.vue';

describe('RegenerateQRModal', () => {
  it('renders the learner name in the confirmation message', () => {
    render(RegenerateQRModal, {
      props: { learnerName: 'Maria Lopez' },
    });
    expect(screen.getByText(/Maria Lopez/)).toBeInTheDocument();
  });

  it('emits confirm when the submit button is clicked', async () => {
    const { emitted } = render(RegenerateQRModal, {
      props: { learnerName: 'Maria Lopez' },
    });
    const submitBtn = screen.getByRole('button', {
      name: 'Regenerate QR code',
    });
    await userEvent.click(submitBtn);
    expect(emitted()).toHaveProperty('confirm');
  });

  it('emits cancel when the cancel button is clicked', async () => {
    const { emitted } = render(RegenerateQRModal, {
      props: { learnerName: 'Maria Lopez' },
    });
    const cancelBtn = screen.getByRole('button', {
      name: 'Cancel',
    });
    await userEvent.click(cancelBtn);
    expect(emitted()).toHaveProperty('cancel');
  });

  it('shows a warning about the old card stopping working', () => {
    render(RegenerateQRModal, {
      props: { learnerName: 'Test User' },
    });
    expect(
      screen.getByText(/stop working immediately/i),
    ).toBeInTheDocument();
  });
});
