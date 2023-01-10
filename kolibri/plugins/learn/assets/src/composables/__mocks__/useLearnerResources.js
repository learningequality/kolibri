/**
 * `useLearnerResources` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useLearnerResources file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useLearnerResourcesMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useLearnerResources, { useLearnerResourcesMock } from '<useLearnerResources file path>';
 *
 * jest.mock('<useLearnerResources file path>')
 *
 * it('test', () => {
 *   useLearnerResources.mockImplementation(
 *     () => useLearnerResourcesMock({ classes: [{ id: 'class-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useLearnerResources.mockImplementation(() => useLearnerResourcesMock())
 * ```
 */

const MOCK_DEFAULTS = {
  classes: [],
  activeClassesLessons: [],
  activeClassesQuizzes: [],
  resumableClassesQuizzes: [],
  resumableClassesResources: [],
  resumableContentNodes: [],
  moreResumableContentNodes: null,
  learnerFinishedAllClasses: false,
  getClass: jest.fn(),
  getClassActiveLessons: jest.fn(),
  getClassActiveQuizzes: jest.fn(),
  getClassLessonLink: jest.fn(),
  getClassQuizLink: jest.fn(),
  fetchClass: jest.fn(),
  fetchClasses: jest.fn(),
  fetchResumableContentNodes: jest.fn(),
  fetchMoreResumableContentNodes: jest.fn(),
};

export function useLearnerResourcesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useLearnerResourcesMock());
