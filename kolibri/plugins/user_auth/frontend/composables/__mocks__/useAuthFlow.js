import { computed, ref } from 'vue';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { ComponentMap } from '../../constants';

const MOCK_DEFAULTS = {
  facilities: ref([]),
  facilityId: ref(null),
  selectedFacility: ref(null),
  facilityConfig: ref({}),
  hasMultipleFacilities: computed(() => false),
  signInMethod: ref(OptionsForSignIn.USERNAME_PASSWORD),
  setSignInMethodForThisVisit: jest.fn(),
  signInRoute: computed(() => ComponentMap.USERNAME_SIGN_IN),
  signInOptions: computed(() => [OptionsForSignIn.USERNAME_PASSWORD]),
  canSignUp: computed(() => false),
  canSignUpWithAnyFacility: computed(() => false),
  canSignUpWithFacility: computed(() => false),
  defaultRoute: computed(() => ComponentMap.USERNAME_SIGN_IN),
  initializeFlow: jest.fn(),
  setFacilityId: jest.fn(),
  fetchOSUsername: jest.fn().mockResolvedValue(null),
};

export function useAuthFlowMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    osUserFormOpened: ref(false),
    ...overrides,
  };
}

export default jest.fn(() => useAuthFlowMock());
