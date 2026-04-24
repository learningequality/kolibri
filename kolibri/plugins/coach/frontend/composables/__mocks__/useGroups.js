/**
 * `useGroups` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useGroups file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useGroupsMock` that accepts
 * an object with values to be overriden and use it together
 * with `mockImplementation`, as shown in the example below.
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import useGroups, { useGroupsMock } from '<useGroups file path>';
 *
 * jest.mock('<useGroups file path>')
 *
 * it('test', () => {
 *   useGroups.mockImplementation(
 *     () => useGroupsMock({ groupsAreLoading: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useGroups.mockImplementation(() => useGroupsMock())
 * ```
 */

const MOCK_DEFAULTS = {
  groupsAreLoading: false,
  showGroupsPage: jest.fn(),
};

/**
 * Creates a mock implementation of the useGroups composable with optional overrides.
 * @param {object} overrides - Properties to override on the default mock values.
 * @returns {object} Mock composable return value.
 */
export function useGroupsMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useGroupsMock());
