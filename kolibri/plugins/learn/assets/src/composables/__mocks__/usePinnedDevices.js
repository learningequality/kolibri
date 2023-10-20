/**
 * `usePinnedDevices` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<usePinnedDevices file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `usePinnedDevicesMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import usePinnedDevices, { usePinnedDevicesMock } from '<usePinnedDevices file path>';
 *
 * jest.mock('<usePinnedDevices file path>')
 *
 * it('test', () => {
 *   usePinnedDevices.mockImplementation(
 *    () => usePinnedDevicesMock({ channels: [{ id: 'channel-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * usePinnedDevices.mockImplementation(() => usePinnedDevicesMock())
 * ```
 */

const MOCK_DEFAULTS = {
  fetchPinsForUser: jest.fn(() => Promise.resolve([])),
  pinnedDevices: [],
  pinnedDevicesExist: false,
  unpinnedDevices: [],
  unpinnedDevicesExist: false,
  handlePinToggle: jest.fn(() => Promise.resolve({})),
  userPinsMap: {},
};

export function usePinnedDevicesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => usePinnedDevicesMock());
