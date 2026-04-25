/**
 * `useUnitDetail` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need to call `jest.mock('<useUnitDetail file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useUnitDetailMock` that accepts
 * an object with values to be overridden and use it together
 * with `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useUnitDetail, { useUnitDetailMock } from '<useUnitDetail file path>';
 *
 * jest.mock('<useUnitDetail file path>')
 *
 * it('test', () => {
 * useUnitDetail.mockImplementation(
 * () => useUnitDetailMock({ lessons: ref([...]) })
 * );
 * })
 * ```
 */

import { ref } from 'vue';

function createDefaults() {
  return {
    loading: ref(false),
    lessons: ref([]),
    courseTitle: ref(''),
    numberedUnitTitle: ref(''),
    resourceTally: jest.fn(() => ({ completed: 0, started: 0, helpNeeded: 0, notStarted: 0 })),
    objectivesForLesson: jest.fn(() => []),
    activeTestStatus: ref('not_activated'),
  };
}

export function useUnitDetailMock(overrides = {}) {
  return {
    ...createDefaults(),
    ...overrides,
  };
}

export const useUnitDetail = jest.fn(() => useUnitDetailMock());

export default useUnitDetail;
