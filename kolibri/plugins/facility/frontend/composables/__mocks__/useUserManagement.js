/**
 * `useUserManegement` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useUserManagement file path>')`
 * at the top of a test file.
 *
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useUserManagementMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useUserManagement, { useUserManagementMock } from '<useUserManegement file path>';
 *
 * jest.mock('<useUserManegement file path>')
 *
 * it('test', () => {
 *   useUserManagement.mockImplementation(
 *    () => useUserManagementMock({ channels: [{ id: 'channel-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useUserManagement.mockImplementation(() => useUserManagementMock())
 * ```
 */
import { ref, computed } from 'vue';

const MOCK_DEFAULTS = {
  selectedUsers: ref(new Set()),
  facilityUsers: computed(() => []),
  totalPages: computed(() => 0),
  usersCount: computed(() => 0),
  dataLoading: computed(() => false),
  page: computed(() => 1),
  pageSize: computed(() => 30),
  ordering: computed(() => null),
  order: computed(() => ''),
  search: computed(() => null),
  userType: computed(() => null),
  classes: computed(() => []),
  onChange: jest.fn(),
  fetchUsers: jest.fn(),
  fetchClasses: jest.fn(),
  resetFilters: jest.fn(),
};

export function useUserManagementMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useUserManagementMock());
