/**
 * `useDownloadRequests` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useDownloadRequests file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useDownloadRequestsMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useDownloadRequests, { useDownloadRequestsMock } from '<useDownloadRequests file path>';
 *
 * jest.mock('<useDownloadRequests file path>')
 *
 * it('test', () => {
 *   useDownloadRequests.mockImplementation(
 *    () => useDownloadRequestsMock({ downloadRequestMap: ... })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useDownloadRequests.mockImplementation(() => useDownloadRequestsMock())
 * ```
 */

const MOCK_DEFAULTS = {
  downloadRequestsTranslator: {
    $tr: jest.fn(),
  },
  downloadRequestMap: {},
  addDownloadRequest: jest.fn(),
  fetchUserDownloadRequests: jest.fn(() => Promise.resolve([])),
  pollUserDownloadRequests: jest.fn(),
  loading: false,
};

export function useDownloadRequestsMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useDownloadRequestsMock());
