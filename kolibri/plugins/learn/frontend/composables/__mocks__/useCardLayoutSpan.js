/**
 * `useCardLayoutSpan` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useCardLayoutSpan file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useCardLayoutSpanMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation`, as shown in the example below.
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import useCardLayoutSpan, { useCardLayoutSpanMock } from '<useCardLayoutSpan file path>';
 *
 * jest.mock('<useCardLayoutSpan file path>')
 *
 * it('test', () => {
 *   useCardLayoutSpan.mockImplementation(
 *    () => useCardLayoutSpanMock({})
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useCardLayoutSpan.mockImplementation(() => useCardLayoutSpanMock())
 * ```
 */

const MOCK_DEFAULTS = {
  layoutSpan: 4,
  makeComputedCardCount: jest.fn(() => 4),
};

/**
 * Creates a mock implementation of the useCardLayoutSpan composable with optional overrides.
 * @param {object} overrides - Properties to override on the default mock values.
 * @returns {object} Mock composable return value.
 */
export function useCardLayoutSpanMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useCardLayoutSpanMock());
