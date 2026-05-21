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
  signInRoute: computed(() => ComponentMap.USERNAME_SIGN_IN),
  signInOptions: computed(() => [OptionsForSignIn.USERNAME_PASSWORD]),
  canSignUp: computed(() => false),
  canSignUpWithAnyFacility: computed(() => false),
  canSignUpWithFacility: computed(() => false),
  defaultRoute: computed(() => ComponentMap.USERNAME_SIGN_IN),
  initializeFlow: jest.fn(),
  setFacilityId: jest.fn(),
};

export function useAuthFlowMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useAuthFlowMock());
