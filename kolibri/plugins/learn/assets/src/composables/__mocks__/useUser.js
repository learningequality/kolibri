/**
 * `useUser` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useUser file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useUserMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useUser, { useUserMock } from '<useUser file path>';
 *
 * jest.mock('<useUser file path>')
 *
 * it('test', () => {
 *   useUser.mockImplementation(
 *     () => useUserMock({ isUserLoggedIn: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useUser.mockImplementation(() => useUserMock())
 * ```
 */

const MOCK_DEFAULTS = {
  isUserLoggedIn: false,
};

export function useUserMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useUserMock());
