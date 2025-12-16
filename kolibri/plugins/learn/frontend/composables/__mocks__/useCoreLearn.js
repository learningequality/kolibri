/**
 * `useCoreLearn` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useCoreLearn file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useCoreLearnMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useCoreLearn, { useCoreLearnMock } from '<useCoreLearn file path>';
 *
 * jest.mock('<useCoreLearn file path>')
 *
 * it('test', () => {
 *   useCoreLearn.mockImplementation(
 *    () => useCoreLearnMock({ inClasses: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useCoreLearn.mockImplementation(() => useCoreLearnMock())
 * ```
 */

export const inClasses = false;
export const canAddDownloads = true;
export const canDownloadExternally = true;

const MOCK_DEFAULTS = {
  inClasses,
  canAddDownloads,
  canDownloadExternally,
};

export function useCoreLearnMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useCoreLearnMock());
