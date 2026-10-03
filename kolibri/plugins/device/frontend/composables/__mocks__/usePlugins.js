export const plugins = [];

const MOCK_DEFAULTS = {
  plugins: { value: [] },
  fetchPlugins: jest.fn(() => Promise.resolve()),
  enablePlugin: jest.fn(),
  disablePlugin: jest.fn(),
  togglePlugin: jest.fn(),
};

export function usePluginsMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => usePluginsMock());
