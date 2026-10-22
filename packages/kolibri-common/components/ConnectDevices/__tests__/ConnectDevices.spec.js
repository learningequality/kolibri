/*
 * @jest-environment-options {"url": "http://kolibri.local:8080/"}
 */
import { render, screen, waitFor, within } from '@testing-library/vue';
import ConnectionUrlsResource from 'kolibri-common/apiResources/ConnectionUrlsResource';
import { connectDevicesStrings } from 'kolibri-common/strings/connectDevicesStrings';
import ConnectDevices from '../index.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(url => Promise.resolve(`data:${url}`)),
}));
jest.mock('kolibri-common/apiResources/ConnectionUrlsResource', () => {
  const resource = jest.requireActual('kolibri-common/apiResources/ConnectionUrlsResource').default;
  resource.list = jest.fn();
  return { __esModule: true, default: resource };
});

const { bookmarkHeading$, ipHeading$, qrAlt$, scanHeading$ } = connectDevicesStrings;

const IP_A = 'http://192.168.1.5:8080/';
const IP_B = 'http://10.0.0.7:8080/';
const KOLIBRI_LOCAL = 'http://kolibri.local:8080/';
const DEVICE_LOCAL = 'http://lab.kolibri.local:8080/';

function ip(url) {
  return { url, is_local_hostname: false };
}

function hostname(url) {
  return { url, is_local_hostname: true };
}

function qrImage() {
  return screen.getByRole('img', { name: qrAlt$() });
}

async function flushFetch() {
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: scanHeading$() })).toBeInTheDocument(),
  );
}

describe('ConnectDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists owned hostnames under the bookmark heading', async () => {
    ConnectionUrlsResource.list.mockResolvedValue([
      ip(IP_A),
      hostname(KOLIBRI_LOCAL),
      hostname(DEVICE_LOCAL),
    ]);
    render(ConnectDevices);
    await flushFetch();
    const bookmarkRegion = screen.getByRole('region', { name: bookmarkHeading$() });
    expect(within(bookmarkRegion).getByRole('link', { name: KOLIBRI_LOCAL })).toHaveAttribute(
      'href',
      KOLIBRI_LOCAL,
    );
    expect(within(bookmarkRegion).getByRole('link', { name: DEVICE_LOCAL })).toHaveAttribute(
      'href',
      DEVICE_LOCAL,
    );
    const ipRegion = screen.getByRole('region', { name: ipHeading$() });
    expect(within(ipRegion).queryByRole('link', { name: KOLIBRI_LOCAL })).not.toBeInTheDocument();
    expect(within(ipRegion).getByRole('link', { name: IP_A })).toHaveAttribute('href', IP_A);
  });

  it('omits the bookmark section when there are no owned hostnames', async () => {
    ConnectionUrlsResource.list.mockResolvedValue([ip(IP_A)]);
    render(ConnectDevices);
    await flushFetch();
    expect(screen.queryByRole('heading', { name: bookmarkHeading$() })).not.toBeInTheDocument();
  });

  it('encodes the first IP URL when the browser host matches none of them', async () => {
    ConnectionUrlsResource.list.mockResolvedValue([hostname(KOLIBRI_LOCAL), ip(IP_A), ip(IP_B)]);
    render(ConnectDevices);
    await waitFor(() => expect(qrImage()).toHaveAttribute('src', `data:${IP_A}`));
    expect(screen.getByTestId('qr-url')).toHaveTextContent(IP_A);
  });

  it('re-renders the QR code, its URL and the IP list when the polled URLs change', async () => {
    ConnectionUrlsResource.list.mockResolvedValueOnce([ip(IP_A)]).mockResolvedValue([ip(IP_B)]);
    render(ConnectDevices);
    await waitFor(() => expect(qrImage()).toHaveAttribute('src', `data:${IP_A}`));

    await jest.advanceTimersByTimeAsync(30000);

    await waitFor(() => expect(qrImage()).toHaveAttribute('src', `data:${IP_B}`));
    expect(screen.getByTestId('qr-url')).toHaveTextContent(IP_B);
    expect(screen.getByRole('link', { name: IP_B })).toHaveAttribute('href', IP_B);
    expect(screen.queryByRole('link', { name: IP_A })).not.toBeInTheDocument();
  });

  it('keeps polling after a failed request', async () => {
    ConnectionUrlsResource.list.mockRejectedValueOnce(new Error()).mockResolvedValue([ip(IP_A)]);
    render(ConnectDevices);
    await waitFor(() => expect(ConnectionUrlsResource.list).toHaveBeenCalledTimes(1));

    await jest.advanceTimersByTimeAsync(30000);

    await waitFor(() => expect(qrImage()).toHaveAttribute('src', `data:${IP_A}`));
  });

  it('replaces the loader with an error message when the first request fails', async () => {
    ConnectionUrlsResource.list.mockRejectedValue(new Error());
    render(ConnectDevices);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(connectDevicesStrings.fetchError$());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps the same error message on screen while a retry is pending and after it fails', async () => {
    let rejectRetry;
    ConnectionUrlsResource.list.mockRejectedValueOnce(new Error()).mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          rejectRetry = reject;
        }),
    );
    render(ConnectDevices);
    const alert = await screen.findByRole('alert');

    await jest.advanceTimersByTimeAsync(30000);
    expect(ConnectionUrlsResource.list).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toBe(alert);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    rejectRetry(new Error());
    await jest.advanceTimersByTimeAsync(0);
    expect(screen.getByRole('alert')).toBe(alert);
  });

  it('shows only a notice when the server has no connection URLs', async () => {
    ConnectionUrlsResource.list.mockResolvedValue([]);
    render(ConnectDevices);
    await waitFor(() => expect(screen.getByTestId('no-network-notice')).toBeInTheDocument());
    expect(screen.getByTestId('no-network-notice')).toHaveTextContent(
      connectDevicesStrings.noNetwork$(),
    );
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('stops polling once unmounted', async () => {
    ConnectionUrlsResource.list.mockResolvedValue([ip(IP_A)]);
    const { unmount } = render(ConnectDevices);
    await flushFetch();
    const callsBeforeUnmount = ConnectionUrlsResource.list.mock.calls.length;

    unmount();
    await jest.advanceTimersByTimeAsync(30000);

    expect(ConnectionUrlsResource.list).toHaveBeenCalledTimes(callsBeforeUnmount);
  });
});
