/**
 * `useChannels` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useChannels file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useChannelsMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useChannels, { useChannelsMock } from '<useChannels file path>';
 *
 * jest.mock('<useChannels file path>')
 *
 * it('test', () => {
 *   useChannels.mockImplementation(
 *    () => useChannelsMock({ channels: [{ id: 'channel-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useChannels.mockImplementation(() => useChannelsMock())
 * ```
 */

const MOCK_DEFAULTS = {
  localChannelsCache: [],
  channelsMap: {},
  getChannelThumbnail: jest.fn(() => ''),
  getChannelTitle: jest.fn(() => ''),
  fetchChannels: jest.fn(() => Promise.resolve([])),
};

export function useChannelsMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useChannelsMock());
