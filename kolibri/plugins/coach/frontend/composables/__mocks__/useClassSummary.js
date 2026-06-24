/**
 * `useClassSummary` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need to call `jest.mock('<useClassSummary file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useClassSummaryMock` that accepts
 * an object with values to be overridden and use it together
 * with `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useClassSummary, { useClassSummaryMock } from '<useClassSummary file path>';
 *
 * jest.mock('<useClassSummary file path>')
 *
 * it('test', () => {
 * useClassSummary.mockImplementation(
 * () => useClassSummaryMock({ getRecipientNamesForCourseSession: jest.fn(() => ['Alice']) })
 * );
 * })
 * ```
 */

import { ref } from 'vue';

function createDefaults() {
  return {
    getRecipientNamesForCourseSession: jest.fn(() => []),
    className: ref(''),
  };
}

export function useClassSummaryMock(overrides = {}) {
  return {
    ...createDefaults(),
    ...overrides,
  };
}

export const useClassSummary = jest.fn(() => useClassSummaryMock());

export default useClassSummary;
