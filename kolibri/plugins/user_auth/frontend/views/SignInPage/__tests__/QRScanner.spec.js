import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import QRScanner from '../QRSignIn/QRScanner.vue';

jest.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest.fn().mockResolvedValue({ stop: jest.fn() }),
    decodeFromImageElement: jest.fn().mockResolvedValue(null),
  })),
}));

const FAKE_STREAM = { getTracks: () => [{ stop: jest.fn() }], active: true };

function setSecureContext(value) {
  Object.defineProperty(window, 'isSecureContext', {
    value,
    configurable: true,
    writable: true,
  });
}

function setMediaDevices(value) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value,
    configurable: true,
  });
}

describe('QRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.BarcodeDetector;
    setSecureContext(false);
    setMediaDevices(undefined);
  });

  it('renders the upload-photo button when camera is not supported', () => {
    render(QRScanner);
    expect(
      screen.getByRole('button', { name: 'Upload a photo of the QR code' }),
    ).toBeInTheDocument();
  });

  it('does not render the camera pane in an insecure context', () => {
    const { container } = render(QRScanner);
    expect(container.querySelector('.camera-pane')).toBeNull();
    expect(container.querySelector('.upload-pane')).toBeTruthy();
  });

  it('renders the camera pane markup when in a secure context', () => {
    setSecureContext(true);
    setMediaDevices({ getUserMedia: jest.fn().mockResolvedValue(FAKE_STREAM) });

    const { container } = render(QRScanner);
    // The camera pane is rendered when cameraSupported() is true, even
    // before start() is called.
    expect(container.querySelector('.camera-pane')).toBeTruthy();
  });

  it('shows the decode-failed alert when the image has no QR code', async () => {
    const { container } = render(QRScanner);
    const input = container.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', {
      value: [{ name: 'noqr.png', type: 'image/png' }],
      configurable: true,
    });
    fireEvent.change(input);

    await waitFor(() =>
      expect(
        screen.getByText(/No QR code was found in that image/i),
      ).toBeInTheDocument(),
    );
  });
});
