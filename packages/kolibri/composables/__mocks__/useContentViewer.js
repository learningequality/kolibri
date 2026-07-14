/**
 * `useContentViewer` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useContentViewer file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useContentViewerMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import useContentViewer, { useContentViewerMock } from '<useContentViewer file path>';
 *
 * jest.mock('<useContentViewer file path>')
 *
 * it('test', () => {
 *   useContentViewer.mockImplementation(
 *     () => useContentViewerMock({ defaultFile: { storage_url: 'foo' } })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useContentViewer.mockImplementation(() => useContentViewerMock())
 * ```
 */
import { ref } from 'vue';

const MOCK_DEFAULTS = {
  files: [],
  options: {},
  lang: null,
  duration: null,
  forceDurationBasedProgress: false,
  durationBasedProgress: null,
  defaultFile: null,
  supplementaryFiles: [],
  thumbnailFiles: [],
  contentDirection: 'ltr',
  contentIsRtl: false,
  availableHints: 0,
  totalHints: 0,
  itemData: null,
  itemId: null,
  answerState: null,
  allowHints: false,
  extraFields: { contentState: {} },
  interactive: false,
  showCorrectAnswer: false,
  timeSpent: 0,
  userId: null,
  userFullName: '',
  progress: 0,
  embedded: false,
};

const MOCK_METHODS = {
  checkAnswer: jest.fn(() => null),
  takeHint: jest.fn(() => null),
  reportError: jest.fn(),
  reportLoadingError: jest.fn(),
};

export function useContentViewerMock(overrides = {}) {
  const mocks = {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
  const refs = {};
  for (const key in mocks) {
    refs[key] = ref(mocks[key]);
  }
  return {
    ...refs,
    ...MOCK_METHODS,
  };
}

export default jest.fn(() => useContentViewerMock());
