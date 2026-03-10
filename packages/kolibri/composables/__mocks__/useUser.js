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
 * // eslint-disable-next-line import-x/named
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
  full_name: '',
  sessionId: undefined,
  kind: [UserKinds.ANONYMOUS],
  username: '',
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
  userPermissions: {},
  userFacilityId: undefined,
  userKind: UserKinds.ANONYMOUS,
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
    if (typeof mocks[key] !== 'function') {
      computedMocks[key] = computed(() => mocks[key]);
    } else {
      computedMocks[key] = mocks[key];
    }
  }
  return computedMocks;
}

export default jest.fn(() => useUserMock());
