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
import { ref, computed } from '@vue/composition-api';
import { UserKinds } from 'kolibri/constants';
import { jest } from '@jest/globals'; // Ensure jest is imported for mocking functions

const MOCK_DEFAULT_SESSION = {
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
  session: { ...MOCK_DEFAULT_SESSION },
  // Mock state
  ...MOCK_DEFAULT_SESSION,
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

  // Module-level state reference for actions
  const session = ref({ ...mocks.session });

  // Mock implementation of `useUser` methods
  return {
    ...computedMocks,
    session, // Make session mutable for test scenarios

    // Actions
    setSession: jest.fn(({ session: newSession, clientNow }) => {
      session.value = {
        ...MOCK_DEFAULT_SESSION,
        ...newSession,
      };
    }),

    kolibriLogin: jest.fn(async () => Promise.resolve()),

    kolibriLogout: jest.fn(() => {}),

    kolibrisetUnspecifiedPassword: jest.fn(async () => Promise.resolve()),
  };
}

export default jest.fn(() => useUserMock());
