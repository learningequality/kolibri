import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import QRScanner from '../SignInPage/QRSignIn/QRScanner.vue';

// @zxing/browser is a native peer dep — stub its reader so it never touches the real browser.
jest.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest
      .fn()
      .mockResolvedValue({ stop: jest.fn() }),
    decodeFromImageElement: jest.fn().mockResolvedValue(null),
  })),
}));

const OriginalBarcodeDetector = window.BarcodeDetector;

describe('QRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The scanner only renders the camera pane in a secure context. Default
    // jsdom to insecure so tests see the upload fallback path.
    delete window.BarcodeDetector;
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
  });

  afterEach(() => {
    if (OriginalBarcodeDetector) {
      window.BarcodeDetector = OriginalBarcodeDetector;
    } else {
      delete window.BarcodeDetector;
    }
  });

  it('renders the upload-photo button even when camera is unsupported', () => {
    render(QRScanner);

    expect(
      screen.getByRole('button', { name: 'Upload a photo of the QR code' }),
    ).toBeInTheDocument();
  });

  it('renders the camera-unavailable alert when start() is called without camera support', async () => {
    render(QRScanner);

    // The component sets status='unavailable' synchronously in start().
    // Wait for the alert to appear.
    await waitFor(() =>
      expect(
        screen.getByText(
          /The camera could not be started. Try uploading a photo/i,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('emits "decoded" when the file-input fallback decodes an image', async () => {
    // Force secure context so the camera pane mounts AND provide a stub BarcodeDetector
    // that resolves the decoded image. The native detector path is simpler to drive
    // from a test than the @zxing/browser path.
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest
          .fn()
          .mockResolvedValue(new MediaStream({ active: true })),
      },
      configurable: true,
    });
    window.BarcodeDetector = jest.fn().mockImplementation(() => ({
      detect: jest.fn().mockResolvedValue([{ rawValue: 'SCANNED_TOKEN' }]),
    }));

    const { emitted } = render(QRScanner);

    // Wait for the upload button to be present (it always is).
    const upload = screen.getByRole('button', {
      name: 'Upload a photo of the QR code',
    });

    // Find the hidden file input and fire a change event with a fake file.
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    Object.defineProperty(input, 'files', {
      value: [{ name: 'qr.png', type: 'image/png' }],
      configurable: true,
    });
    fireEvent.change(input);

    // Wait for the async decode to complete and emit.
    await waitFor(() =>
      expect(emitted()).toHaveProperty('decoded'),
    );
    expect(emitted().decoded[0]).toEqual(['SCANNED_TOKEN']);
  });

  it('shows the decode-failed alert when the image has no QR code', async () => {
    // No native detector and zxing returns null from the stub above.
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
