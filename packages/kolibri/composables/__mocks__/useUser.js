/**
 * `useUser` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useUser file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useUserMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useUser, { useUserMock } from '<useUser file path>';
 *
 * jest.mock('<useUser file path>')
 *
 * it('test', () => {
 *   useUser.mockImplementation(
 *     () => useUserMock({ isUserLoggedIn: true })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useUser.mockImplementation(() => useUserMock())
 * ```
 */
import { computed } from 'vue';
import { UserKinds } from 'kolibri/constants';

const session = {
  app_context: false,
  can_manage_content: false,
  facility_id: undefined,
  full_name: '',
  id: undefined,
  kind: [UserKinds.ANONYMOUS],
  user_id: undefined,
  username: '',
  full_facility_import: true,
};

const MOCK_DEFAULTS = {
  isLearnerOnlyImport: false,
  isUserLoggedIn: false,
  currentUserId: null,
  isCoach: false,
  isAdmin: false,
  isSuperuser: false,
  canManageContent: false,
  isAppContext: false,
  isClassCoach: false,
  isFacilityCoach: false,
  isLearner: true,
  isFacilityAdmin: false,
  userIsMultiFacilityAdmin: false,
  getUserPermissions: {},
  userFacilityId: undefined,
  getUserKind: UserKinds.ANONYMOUS,
  userHasPermissions: false,
  session,
  //state
  ...session,
};

export function useUserMock(overrides = {}) {
  const mocks = {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
  const computedMocks = {};
  for (const key in mocks) {
    computedMocks[key] = computed(() => mocks[key]);
  }
  return computedMocks;
}

export default jest.fn(() => useUserMock());
