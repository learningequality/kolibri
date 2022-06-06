export let isIndividual = false;

const MOCK_DEFAULTS = {
  isIndividual,
};

export function useIndividualDeviceMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useIndividualDeviceMock());
