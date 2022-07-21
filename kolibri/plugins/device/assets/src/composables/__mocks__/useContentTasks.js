/**
 * `useContentTasks` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useContentTasks file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useContentTasksMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useContentTasks, { useContentTasksMock } from '<useContentTasks file path>';
 *
 * jest.mock('<useContentTasks file path>')
 *
 * it('test', () => {
 *   useContentTasks.mockImplementation(
 *    () => useContentTasksMock({ channels: [{ id: 'channel-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useContentTasks.mockImplementation(() => useContentTasksMock())
 * ```
 */

const MOCK_DEFAULTS = {
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
};

export function useContentTasksMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useContentTasksMock());
