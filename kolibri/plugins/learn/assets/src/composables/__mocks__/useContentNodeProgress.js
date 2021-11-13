/**
 * `useContentNodeProgress` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useContentNodeProgress file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useContentNodeProgressMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useContentNodeProgress, {
 *  useContentNodeProgressMock
 * } from '<useContentNodeProgress file path>';
 *
 * jest.mock('<useContentNodeProgress file path>')
 *
 * it('test', () => {
 *   useContentNodeProgress.mockImplementation(
 *     () => useContentNodeProgressMock({ isUserLoggedIn: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useContentNodeProgress.mockImplementation(() => useContentNodeProgressMock())
 * ```
 */

const MOCK_DEFAULTS = {
  fetchContentNodeProgress: jest.fn(),
  fetchContentNodeTreeProgress: jest.fn(),
  contentNodeProgressMap: {},
};

export function useContentNodeProgressMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useContentNodeProgressMock());
