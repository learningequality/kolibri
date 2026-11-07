/*
 * @jest-environment-options {"url": "http://10.0.0.7:8080/"}
 *
 * jsdom 26 makes window.location non-configurable, so the browser host is
 * fixed for the file via @jest-environment-options.
 */
import { render, screen, waitFor } from '@testing-library/vue';
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

const IP_A = 'http://192.168.1.5:8080/';
const IP_B = 'http://10.0.0.7:8080/';

describe('ConnectDevices QR target', () => {
  it('encodes the IP URL the browser is already using', async () => {
    ConnectionUrlsResource.list.mockResolvedValue([
      { url: IP_A, is_local_hostname: false },
      { url: IP_B, is_local_hostname: false },
    ]);
    render(ConnectDevices);
    await waitFor(() =>
      expect(screen.getByRole('img', { name: connectDevicesStrings.qrAlt$() })).toHaveAttribute(
        'src',
        `data:${IP_B}`,
      ),
    );
    expect(screen.getByTestId('qr-url')).toHaveTextContent(IP_B);
  });
});
