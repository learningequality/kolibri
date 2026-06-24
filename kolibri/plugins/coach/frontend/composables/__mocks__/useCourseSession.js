/**
 * `useCourseSession` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need to call `jest.mock('<useCourseSession file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useCourseSessionMock` that accepts
 * an object with values to be overridden and use it together
 * with `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useCourseSession, { useCourseSessionMock } from '<useCourseSession file path>';
 *
 * jest.mock('<useCourseSession file path>')
 *
 * it('test', () => {
 * useCourseSession.mockImplementation(
 * () => useCourseSessionMock({ courseSession: ref({ active: true }) })
 * );
 * })
 * ```
 */

import { ref } from 'vue';

function createDefaults() {
  return {
    pageLoading: ref(false),
    dataLoading: ref(false),
    contentMissing: ref(false),
    courseSession: ref(null),
    course: ref(null),
    activeTest: ref(null),
    units: ref([]),
    activeUnit: ref(null),
    activeUnitIndex: ref(0),
    completedUnits: ref([]),
    upcomingUnits: ref([]),
    isCourseComplete: ref(false),
    unitPhase: ref(null),
    lastUnitTest: ref(null),
    activateTest: jest.fn(),
    closeTest: jest.fn(),
    toggleCourseActive: jest.fn(),
    refreshCourseSessionData: jest.fn(),
  };
}

export function useCourseSessionMock(overrides = {}) {
  return {
    ...createDefaults(),
    ...overrides,
  };
}

export const useCourseSession = jest.fn(() => useCourseSessionMock());

export default useCourseSession;
