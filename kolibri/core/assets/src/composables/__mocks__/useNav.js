/**
 * `useNav` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useNav file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useNavMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useNav, { useNavMock } from '<useNav file path>';
 *
 * jest.mock('<useNav file path>')
 *
 * it('test', () => {
 *   useNav.mockImplementation(
 *     () => useNavMock({ isUserLoggedIn: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useNav.mockImplementation(() => useNavMock())
 * ```
 */

const MOCK_DEFAULTS = {
  navItems: [],
  topBarHeight: 64,
};

export function useNavMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useNavMock());
