/**
 * `useSearch` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useSearch file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useSearchMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useSearch, { useSearchMock } from '<useSearch file path>';
 *
 * jest.mock('<useSearch file path>')
 *
 * it('test', () => {
 *   useSearch.mockImplementation(
 *     () => useSearchMock({ classes: [{ id: 'class-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useSearch.mockImplementation(() => useSearchMock())
 * ```
 */

const MOCK_DEFAULTS = {
  searchTerms: {
    learning_activities: {},
    categories: {},
    learner_needs: {},
    channels: {},
    accessibility_labels: {},
    languages: {},
    grade_levels: {},
  },
  displayingSearchResults: false,
  searchLoading: false,
  moreLoading: false,
  results: [],
  more: null,
  labels: null,
  search: jest.fn(),
  searchMore: jest.fn(),
  removeFilterTag: jest.fn(),
  clearSearch: jest.fn(),
  currentRoute: jest.fn(() => {
    // return a $route-flavored object to avoid undefined errors
    return {
      params: {},
      query: {},
      path: '',
      fullPath: '',
      name: '',
      meta: {},
    };
  }),
};

export function useSearchMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useSearchMock());

export const injectSearch = jest.fn(() => ({
  availableLearningActivities: [],
  availableLibraryCategories: [],
  availableResourcesNeeded: [],
  availableGradeLevels: [],
  availableAccessibilityOptions: [],
  availableLanguages: [],
  availableChannels: [],
  searchableLabels: [],
  activeSearchTerms: [],
}));

export const searchKeys = [];
