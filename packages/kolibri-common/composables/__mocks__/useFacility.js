import { ref, computed } from 'vue';
import { OptionsForSignIn } from '../../constants/Auth';

const MOCK_DEFAULTS = {
  selectedFacility: ref({}),
  facilityId: ref(null),
  facilityConfig: ref({}),
  currentFacilityName: ref(''),
  fetchFacilities: jest.fn(),
  updateFacilityConfig: jest.fn(),
  setFacilityId: jest.fn(),
};

const MOCK_DEFAULTS_SELECT = {
  selectedFacilityId: ref(null),
  setSelectedFacilityId: jest.fn(),
};

const MOCK_DEFAULTS_CONFIG = {
  facilityConfig: ref({}),
  isAttendanceFeatureEnabled: computed(() => true),
  isPictureLoginFeatureEnabled: computed(() => true),
  signInOptions: computed(() => [OptionsForSignIn.USERNAME_PASSWORD]),
  picturePasswordSettings: computed(() => null),
  fetchFacilityConfig: jest.fn(),
};

export function useFacilityMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export function useFacilitySelectMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS_SELECT,
    ...overrides,
  };
}

export function useFacilityConfigMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS_CONFIG,
    ...overrides,
  };
}

// Main default export for useFacility
const mock = jest.fn(() => useFacilityMock());

// Named export for useFacilityConfig
export const useFacilityConfig = jest.fn(() => useFacilityConfigMock());

// // Named export for useFacilitySelect
export const useFacilitySelect = jest.fn(() => useFacilitySelectMock());

export default mock;
