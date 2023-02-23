export const onMyOwnSetup = false;

const MOCK_DEFAULTS = {
  onMyOwnSetup,
};

export function useOnMyOwnSetupMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useOnMyOwnSetupMock());
