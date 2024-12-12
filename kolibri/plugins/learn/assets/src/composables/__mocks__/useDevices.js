/**
 * `useDevices` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useDevices file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useDevicesMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useDevices, { useDevicesMock } from '<useDevices file path>';
 *
 * jest.mock('<useDevices file path>')
 *
 * it('test', () => {
 *   useDevices.mockImplementation(
 *    () => useDevicesMock({ channels: [{ id: 'channel-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useDevices.mockImplementation(() => useDevicesMock())
 * ```
 */

import { ref } from 'vue';

const MOCK_DEFAULTS = {
  fetchDevices: jest.fn(() => Promise.resolve([])),
  baseurl: null,
  deviceChannelsMap: ref({}),
  networkDevices: ref({}),
  networkDevicesWithChannels: ref([]),
  keepDeviceChannelsUpdated: jest.fn(),
  isLoadingChannels: false,
  isLoading: false,
};

export function useDevicesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

const DEVICE_DATA_DEFAULTS = {
  baseurl: 'http://test-device',
  deviceName: 'test-device',
  instanceId: '1234',
};

export const currentDeviceData = jest.fn(() => DEVICE_DATA_DEFAULTS);

export default jest.fn(() => useDevicesMock());

export const setCurrentDevice = jest.fn(id =>
  Promise.resolve({ id, device_name: 'test-device', baseurl: 'http://test-device' }),
);
