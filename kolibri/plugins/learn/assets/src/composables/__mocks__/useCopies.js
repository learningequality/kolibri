/**
 * `useCopies` composable function mock
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useCopies file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useCopiesMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useCopies, { useCopiesMock } from '<useCopies file path>';
 *
 * jest.mock('<useCopies file path>')
 *
 * it('test', () => {
 *   useCopies.mockImplementation(
 *     () => useCopiesMock({ isUserLoggedIn: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useCopies.mockImplementation(() => useCopiesMock())
 * ```
 */

const MOCK_DEFAULTS = {
  displayedCopies: [],
};

export function useCopiesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useCopiesMock());
