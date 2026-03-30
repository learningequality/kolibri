import { ref } from 'vue';

const MOCK_DEFAULTS = {
  selectedFacility: ref({}),
  facilityId: ref(null),
  facilityConfig: ref({}),
  currentFacilityName: ref(''),
  fetchFacilities: jest.fn(),
  updateFacilityConfig: jest.fn(),
  setFacilityId: jest.fn(),
};

const MOCK_DEFAULTS_CONFIG = {
  facilityConfig: ref({}),
  fetchFacilityConfig: jest.fn(),
};

export function useFacilityMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
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

export default mock;
