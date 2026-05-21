import { ref, computed } from 'vue';

const MOCK_DEFAULTS = {
  facilities: ref([]),
  hasMultipleFacilities: computed(() => false),
  userIsMultiFacilityAdmin: computed(() => false),
  fetchFacilities: jest.fn(),
  fetchFacility: jest.fn(),
  getFacility: jest.fn(),
};

export function useFacilitiesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useFacilitiesMock());
