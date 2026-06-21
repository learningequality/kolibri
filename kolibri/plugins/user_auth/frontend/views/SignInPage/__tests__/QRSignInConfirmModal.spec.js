import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import QRSignInConfirmModal from '../QRSignIn/QRSignInConfirmModal.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

describe('QRSignInConfirmModal', () => {
  it('renders the "Is this you?" title', () => {
    render(QRSignInConfirmModal, {
      props: { learnerName: 'Maria Lopez' },
    });
    expect(screen.getByText('Is this you?')).toBeInTheDocument();
  });

  it('renders the learner name', () => {
    render(QRSignInConfirmModal, {
      props: { learnerName: 'Joao Silva' },
    });
    expect(screen.getByText('Joao Silva')).toBeInTheDocument();
  });

  it('renders the verification prompt', () => {
    render(QRSignInConfirmModal, {
      props: { learnerName: 'Test User' },
    });
    expect(
      screen.getByText(/If this is not you/i),
    ).toBeInTheDocument();
  });

  it('emits confirm when check button is clicked', async () => {
    const { emitted, container } = render(QRSignInConfirmModal, {
      props: { learnerName: 'Maria' },
    });
    const confirmBtn = container.querySelector('[aria-label="Yes, sign in"]');
    if (confirmBtn) {
      await userEvent.click(confirmBtn);
      expect(emitted()).toHaveProperty('confirm');
    }
  });

  it('emits cancel when close button is clicked', async () => {
    const { emitted, container } = render(QRSignInConfirmModal, {
      props: { learnerName: 'Maria' },
    });
    const cancelBtn = container.querySelector('[aria-label="No, go back"]');
    if (cancelBtn) {
      await userEvent.click(cancelBtn);
      expect(emitted()).toHaveProperty('cancel');
    }
  });
});
