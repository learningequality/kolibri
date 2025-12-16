/**
 * `useContentLink` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useContentLink file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useContentLinkMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useContentLink, { useContentLinkMock } from '<useContentLink file path>';
 *
 * jest.mock('<useContentLink file path>')
 *
 * it('test', () => {
 *   useContentLink.mockImplementation(
 *    () => useContentLinkMock({ channels: [{ id: 'channel-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useContentLink.mockImplementation(() => useContentLinkMock())
 * ```
 */

const MOCK_DEFAULTS = {
  genContentLinkBackLinkCurrentPage: jest.fn(() => ({})),
  genContentLinkKeepCurrentBackLink: jest.fn(() => ({})),
  genExternalContentURLBackLinkCurrentPage: jest.fn(() => ({})),
  genExternalBackURL: jest.fn(() => ({})),
  genLibraryPageBackLink: jest.fn(() => ({})),
  genExploreLibrariesPageBackLink: jest.fn(() => ({})),
  back: {},
};

export function useContentLinkMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useContentLinkMock());
