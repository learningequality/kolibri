import { render, screen, waitFor } from '@testing-library/vue';
import UserQRCode from '../UserQRCode.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

const QRCode = require('qrcode');

describe('UserQRCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,FAKE_QR');
  });

  it('renders an <img> with the data URL when a token is provided', async () => {
    render(UserQRCode, { props: { token: 'abc123' } });

    const img = await waitFor(() => screen.getByRole('img'));
    expect(img).toHaveAttribute('src', 'data:image/png;base64,FAKE_QR');
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ width: 160, errorCorrectionLevel: 'M' }),
    );
  });

  it('passes the size prop through to the qrcode library', async () => {
    render(UserQRCode, { props: { token: 'abc123', size: 240 } });

    await waitFor(() => screen.getByRole('img'));
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ width: 240 }),
    );
  });

  it('does not call qrcode when the token is empty', async () => {
    render(UserQRCode, { props: { token: '' } });

    expect(QRCode.toDataURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls qrcode again when mounted with a different token', async () => {
    render(UserQRCode, { props: { token: 'first' } });
    await waitFor(() => expect(QRCode.toDataURL).toHaveBeenCalledTimes(1));

    // Mount a second instance with a different token; @testing-library/vue
    // in this version doesn't expose rerender, so we render afresh.
    render(UserQRCode, { props: { token: 'second' } });
    await waitFor(() => expect(QRCode.toDataURL).toHaveBeenCalledTimes(2));
    expect(QRCode.toDataURL).toHaveBeenLastCalledWith(
      'second',
      expect.anything(),
    );
  });
});
