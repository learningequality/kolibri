import { render } from '@testing-library/vue';
import QRScanner from '../QRSignIn/QRScanner.vue';

jest.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest.fn().mockResolvedValue({ stop: jest.fn() }),
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

  it('does not render the camera pane in an insecure context', () => {
    const { container } = render(QRScanner);
    expect(container.querySelector('.camera-pane')).toBeNull();
  });

  it('renders the camera pane markup when in a secure context', () => {
    setSecureContext(true);
    setMediaDevices({ getUserMedia: jest.fn().mockResolvedValue(FAKE_STREAM) });

    const { container } = render(QRScanner);
    // The camera pane is rendered when cameraSupported() is true, even
    // before start() is called.
    expect(container.querySelector('.camera-pane')).toBeTruthy();
  });
});
