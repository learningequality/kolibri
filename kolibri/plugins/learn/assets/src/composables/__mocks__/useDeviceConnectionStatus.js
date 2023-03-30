const MOCK_DEFAULTS = { disconnected: false };

export function useDeviceConnectionStatusMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useDeviceConnectionStatusMock());
