/**
 * `useLessons` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useLessons file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useLessonsMock` that accepts
 * an object with values to be overriden and use it together
 * with `mockImplementation`, as shown in the example below.
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import useLessons, { useLessonsMock } from '<useLessons file path>';
 *
 * jest.mock('<useLessons file path>')
 *
 * it('test', () => {
 *   useLessons.mockImplementation(
 *     () => useLessonsMock({ lessonsAreLoading: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useLessons.mockImplementation(() => useLessonsMock())
 * ```
 */

const MOCK_DEFAULTS = {
  lessonsAreLoading: false,
  showLessonsRootPage: jest.fn(),
};

/**
 * Creates a mock implementation of the useLessons composable with optional overrides.
 * @param {object} overrides - Properties to override on the default mock values.
 * @returns {object} Mock composable return value.
 */
export function useLessonsMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useLessonsMock());
