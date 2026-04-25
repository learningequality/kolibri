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
 * with  `mockImplementation`, as shown in the example below.
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import useLearnerResources, { useLearnerResourcesMock } from '<useLearnerResources file path>';
 *
 * jest.mock('<useLearnerResources file path>')
 *
 * it('test', () => {
 * useLearnerResources.mockImplementation(
 * () => useLearnerResourcesMock({ classes: [{ id: 'class-1' }] })
 * );
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
  activeClassesCourses: [],
  activeClassesQuizzes: [],
  resumableClassesQuizzes: [],
  resumableClassesResources: [],
  resumableContentNodes: [],
  courses: [],
  moreResumableContentNodes: null,
  learnerFinishedAllClasses: false,
  getCourseContent: jest.fn(),
  getCourseProgress: jest.fn(),
  getCourseUnits: jest.fn(),
  fetchCourse: jest.fn(),
  fetchCourses: jest.fn(),
  isUnitTestAvailable: jest.fn(),
  getClass: jest.fn(),
  getClassActiveLessons: jest.fn(),
  getClassActiveCourses: jest.fn(),
  getClassActiveQuizzes: jest.fn(),
  getClassLessonLink: jest.fn(),
  getClassCourseLink: jest.fn(),
  getClassQuizLink: jest.fn(),
  fetchClass: jest.fn(),
  fetchClasses: jest.fn(),
  fetchLesson: jest.fn(),
  fetchResumableContentNodes: jest.fn(),
  fetchMoreResumableContentNodes: jest.fn(),
};

export function useLearnerResourcesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export const setClasses = jest.fn();
export const setResumableContentNodes = jest.fn();

export default jest.fn(() => useLearnerResourcesMock());
