/**
 * `useCourses` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need to call `jest.mock('<useCourses file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values for some tests,
 * or if you need to inspect the state of the refs during tests,
 * you can import a helper function `useCoursesMock` that accepts
 * an object with values to be overridden and use it together
 * with `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import useCourses, { useCoursesMock } from '<useCourses file path>';
 *
 * jest.mock('<useCourses file path>')
 * describe('describe test', function () {
 * let courses = { courses: ref([]) }
 *
 * beforeAll(() => {
 * useCourses.mockImplementation(() => useCoursesMock(courses))
 * })
 *
 * it('the test', () => {
 * expect(courses.courses.value).toEqual([]);
 * })
 * })
 * ```
 */
import { ref } from 'vue';

const MOCK_DEFAULTS = {
  classId: ref(null),
  courses: ref([]),
  coursesAreLoading: ref(false),
  setCourses: jest.fn(),
  updateCourse: jest.fn(),
  removeCourse: jest.fn(),
  refreshClassCourses: jest.fn().mockResolvedValue([]),
};

export function useCoursesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export const useCourses = jest.fn(() => useCoursesMock());
export default useCourses;
