/**
 * `useDeviceSettings` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useDeviceSettings file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useDeviceSettingsMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useDeviceSettings, { useDeviceSettingsMock } from '<useDeviceSettings file path>';
 *
 * jest.mock('<useDeviceSettings file path>')
 *
 * it('test', () => {
 *   useDeviceSettings.mockImplementation(
 *    () => useDeviceSettingsMock({ allowGuestAccess: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useDeviceSettings.mockImplementation(() => useDeviceSettingsMock())
 * ```
 */

const MOCK_DEFAULTS = {
  allowGuestAccess: false,
  canAccessUnassignedContent: false,
};

export function useDeviceSettingsMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useDeviceSettingsMock());
