import { render, screen, waitFor } from '@testing-library/vue';
import LearnerQRCard from '../LearnerQRCard.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

describe('LearnerQRCard', () => {
  it("renders the learner's name, username, and photo placeholder", async () => {
    render(LearnerQRCard, {
      props: {
        learner: {
          full_name: 'Maria López',
          username: 'maria',
          qr_login_token: 'tok123',
        },
      },
    });

    expect(screen.getByText('Maria López')).toBeInTheDocument();
    expect(screen.getByText('maria')).toBeInTheDocument();
    expect(screen.getByText('Photo')).toBeInTheDocument();

    const img = await waitFor(() => screen.getByRole('img'));
    expect(img).toHaveAttribute('src', 'data:image/png;base64,FAKE_QR');
  });

  it('renders the card with custom qrSize prop', async () => {
    render(LearnerQRCard, {
      props: {
        learner: {
          full_name: 'Test',
          username: 'test',
          qr_login_token: 'tok',
        },
        qrSize: 300,
      },
    });

    const img = await waitFor(() => screen.getByRole('img'));
    expect(img).toHaveAttribute('style', expect.stringContaining('300px'));
  });
});
