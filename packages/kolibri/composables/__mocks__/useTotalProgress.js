/**
 * `useTotalProgress` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useTotalProgress file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values for some tests,
 * or if you need to inspect the state of the refs during tests,
 * you can import a helper function `useTotalProgressMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useTotalProgress, { useTotalProgressMock } from '<useTotalProgress file path>';
 *
 * jest.mock('<useTotalProgress file path>')
 * describe('describe test', function () {
 *   let totalProgressMock = { totalProgress: ref(null) }
 *
 *   beforeAll(() => {
 *     useTotalProgress.mockImplementation(() => useTotalProgressMock(totalProgressMock)
 *   })
 *
 *   it('the test', () => {
 *     expect(get(totalProgressMock.totalProgress)).toEqual(null);
 *   )
 * })
 * ```
 */
import { ref, computed } from 'vue';
import { get, set } from '@vueuse/core';
import { MaxPointsPerContent } from 'kolibri/constants';

const MOCK_DEFAULTS = {
  totalProgress: ref(null),
};

export function useTotalProgressMock(overrides = {}) {
  const mocks = {
    ...MOCK_DEFAULTS,
    ...overrides,
  };

  const totalPoints = computed(() => mocks.totalProgress.value * MaxPointsPerContent);

  const fetchPoints = jest.fn();

  const incrementTotalProgress = progress => {
    set(mocks.totalProgress, get(mocks.totalProgress) + progress);
  };

  return {
    totalPoints,
    fetchPoints,
    incrementTotalProgress,
    ...mocks,
  };
}

export default jest.fn(() => useTotalProgressMock());
