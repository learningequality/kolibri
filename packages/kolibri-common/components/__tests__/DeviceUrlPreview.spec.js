/*
 * @jest-environment-options {"url": "http://kolibri.time:8080/"}
 *
 * The served port is read from window.location.port. jsdom 26 makes
 * window.location non-configurable (it cannot be deleted or redefined at
 * runtime), so the port is fixed for the file via @jest-environment-options
 * rather than stubbed per test.
 */
import { render, screen } from '@testing-library/vue';
import DeviceUrlPreview from '../DeviceUrlPreview';

const mockSendPoliteMessage = jest.fn();

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: jest.fn(() => ({ sendPoliteMessage: mockSendPoliteMessage })),
}));

// The previewed URL is data derived from the device name, not translated
// copy, so it is matched via named constants (an allowed non-literal arg for
// the tests-no-hardcoded-strings rule).
const TONYS_LAPTOP_URL = /http:\/\/tonyslaptop\.local:8080/;
const BASE_KOLIBRI_LOCAL_URL = /http:\/\/kolibri\.local:8080/;
const LAB1_URL = /http:\/\/lab1\.local:8080/;
const LAB2_URL = /http:\/\/lab2\.local:8080/;

describe('DeviceUrlPreview', () => {
  beforeEach(() => {
    mockSendPoliteMessage.mockClear();
  });

  it('renders the slugified .local URL with the served port', () => {
    render(DeviceUrlPreview, { props: { deviceName: "Tony's Laptop" } });
    expect(screen.getByText(TONYS_LAPTOP_URL)).toBeInTheDocument();
  });

  it('renders the fallback message with the ported base URL when a name slugifies to empty', () => {
    render(DeviceUrlPreview, { props: { deviceName: '日本語' } });
    // fallback references the base kolibri.local URL with the served port
    expect(screen.getByText(BASE_KOLIBRI_LOCAL_URL)).toBeInTheDocument();
  });

  it('shows no message when the field is blank (nothing typed yet)', () => {
    const { container } = render(DeviceUrlPreview, { props: { deviceName: '   ' } });
    const preview = container.querySelector('.url-preview');
    expect(preview).toBeTruthy(); // preview element stays in the DOM
    expect(preview.textContent.trim()).toBe(''); // but carries no message
  });

  it('updates the preview when the name changes (each keystroke)', async () => {
    const { updateProps } = render(DeviceUrlPreview, { props: { deviceName: 'Lab1' } });
    expect(screen.getByText(LAB1_URL)).toBeInTheDocument();
    await updateProps({ deviceName: 'Lab2' });
    expect(screen.getByText(LAB2_URL)).toBeInTheDocument();
  });

  it('announces the updated preview through the shared KDS live region', async () => {
    const { updateProps } = render(DeviceUrlPreview, { props: { deviceName: 'Lab1' } });
    await updateProps({ deviceName: 'Lab2' });
    expect(mockSendPoliteMessage).toHaveBeenCalledWith(expect.stringMatching(LAB2_URL));
  });
});
