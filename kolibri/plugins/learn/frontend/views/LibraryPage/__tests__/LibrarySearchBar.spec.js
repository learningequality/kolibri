import { nextTick, ref } from 'vue';
import VueRouter from 'vue-router';
import { render, screen, fireEvent } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useRecentSearches from 'kolibri-common/composables/useRecentSearches';
import { PageNames } from '../../../constants';
import LibrarySearchBar from '../LibrarySearchBar.vue';

const { searchLabel$, clearAction$, startSearchButtonLabel$ } = coreStrings;
const { autocompleteResultsAvailable$ } = searchAndFilterStrings;

const mockAddSearch = jest.fn();
const mockAutoCompleteHandler = jest.fn();
const mockSetKeywords = jest.fn();
const mockClearKeywords = jest.fn();
const mockSelectFilterSuggestion = jest.fn();
const mockSelectFilterCombination = jest.fn();
const mockSendPoliteMessage = jest.fn();
const mockRecentSearch = 'fraction videos';

// Mock composables used in setup()
jest.mock('kolibri/composables/useUser');

jest.mock('kolibri-common/composables/useRecentSearches', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    recentSearches: require('vue').ref([mockRecentSearch]),
    addSearch: mockAddSearch,
  })),
}));

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    sendPoliteMessage: mockSendPoliteMessage,
    sendAssertiveMessage: jest.fn(),
  })),
}));

jest.mock('../../../composables/useLearnerResources', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    resumableContentNodes: require('vue').computed(() => [
      {
        id: 'node-1',
        title: 'Recent Video',
        learning_activities: [require('kolibri/constants').LearningActivities.WATCH],
      },
    ]),
  })),
}));

function renderComponent({ keywords = '', provides = {} } = {}) {
  const keywordsInput = ref(keywords);
  const utils = render(LibrarySearchBar, {
    provide: {
      keyWordAutoCompleteHandler: mockAutoCompleteHandler,
      autoCompleteSuggestions: ref([]),
      keywordsInput,
      setKeywords: mockSetKeywords,
      clearKeywords: mockClearKeywords,
      selectFilterSuggestion: mockSelectFilterSuggestion,
      selectFilterCombination: mockSelectFilterCombination,
      ...provides,
    },
    routes: [
      { path: '/library', name: PageNames.LIBRARY },
      { path: '/topics_content', name: PageNames.TOPICS_CONTENT },
      { path: '/topics_topic', name: PageNames.TOPICS_TOPIC },
    ],
  });
  return { keywordsInput, ...utils };
}

describe('LibrarySearchBar', () => {
  let pushSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock({ currentUserId: 'test-user' }));
    pushSpy = jest.spyOn(VueRouter.prototype, 'push').mockResolvedValue();
  });

  afterEach(() => {
    pushSpy.mockRestore();
  });

  describe('rendering', () => {
    it('exposes a search landmark so it can be reached independent of the skip link', () => {
      renderComponent();
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('renders a search input', () => {
      renderComponent();
      expect(screen.getByRole('combobox', { name: searchLabel$() })).toBeInTheDocument();
    });

    it('renders a search submit button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: startSearchButtonLabel$() })).toBeInTheDocument();
    });
  });

  describe('clear button', () => {
    it('shows clear button when input has text', () => {
      renderComponent({ keywords: 'fraction' });
      expect(screen.getByRole('button', { name: clearAction$() })).toBeInTheDocument();
    });

    it('does not show clear button when input is empty', () => {
      renderComponent();
      expect(screen.queryByRole('button', { name: clearAction$() })).not.toBeInTheDocument();
    });

    it('clears the keywords and resets autocomplete when clear button is clicked', async () => {
      renderComponent({ keywords: 'fraction' });
      await fireEvent.click(screen.getByRole('button', { name: clearAction$() }));
      expect(mockClearKeywords).toHaveBeenCalled();
      expect(mockAutoCompleteHandler).toHaveBeenCalledWith('');
    });
  });

  describe('events', () => {
    it('updates the keyword input and calls autocomplete handler on text change', async () => {
      const { keywordsInput } = renderComponent();
      await fireEvent.update(screen.getByRole('combobox', { name: searchLabel$() }), 'frac');
      expect(keywordsInput.value).toBe('frac');
      expect(mockAutoCompleteHandler).toHaveBeenCalledWith('frac');
    });

    it('submits the keywords on enter key', async () => {
      renderComponent({ keywords: 'fraction' });
      await fireEvent.keyDown(screen.getByRole('combobox', { name: searchLabel$() }), {
        key: 'Enter',
      });
      expect(mockSetKeywords).toHaveBeenCalledWith('fraction');
    });

    it('records the search term when submitting', async () => {
      renderComponent({ keywords: 'fraction' });
      await fireEvent.keyDown(screen.getByRole('combobox', { name: searchLabel$() }), {
        key: 'Enter',
      });
      expect(mockAddSearch).toHaveBeenCalledWith('fraction');
    });

    it('scopes recent searches to the current user', () => {
      renderComponent();
      // The user id ref from useUser must be the one handed to useRecentSearches,
      // otherwise searches persist under a shared, unscoped storage key.
      const { currentUserId } = useUser.mock.results[0].value;
      expect(useRecentSearches).toHaveBeenCalledWith(currentUserId);
    });
  });

  describe('autocomplete dropdown', () => {
    it('shows recent searches when the input is focused without a query', async () => {
      renderComponent();
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      expect(screen.getByText(mockRecentSearch)).toBeInTheDocument();
    });

    it('announces the option count for screen readers when the dropdown opens', async () => {
      // One history item + one recent search = two options.
      renderComponent();
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      expect(mockSendPoliteMessage).toHaveBeenCalledWith(
        autocompleteResultsAvailable$({ count: 2 }),
      );
    });

    it('submits a recent search when it is selected', async () => {
      renderComponent();
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      await fireEvent.click(screen.getByText(mockRecentSearch));
      expect(mockSetKeywords).toHaveBeenCalledWith(mockRecentSearch);
    });

    it('re-ranks a recent search to most-recent when it is selected', async () => {
      renderComponent();
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      await fireEvent.click(screen.getByText(mockRecentSearch));
      expect(mockAddSearch).toHaveBeenCalledWith(mockRecentSearch);
    });

    it('navigates to a content suggestion when it is selected', async () => {
      const item = { id: 'node-3', title: 'Fraction Basics', type: 'content' };
      renderComponent({
        keywords: 'frac',
        provides: { autoCompleteSuggestions: ref([item]) },
      });
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      await fireEvent.click(screen.getByText(item.title));
      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: PageNames.TOPICS_CONTENT,
          params: expect.objectContaining({ id: 'node-3' }),
        }),
      );
    });

    it('returns a selected content suggestion to the results for the typed keyword', async () => {
      const item = { id: 'node-3', title: 'Fraction Basics', type: 'content' };
      renderComponent({
        keywords: 'frac',
        provides: { autoCompleteSuggestions: ref([item]) },
      });
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      await fireEvent.click(screen.getByText(item.title));
      // The keyword is never navigated to before the resource is opened, so the
      // back link has to carry it rather than snapshot it from the route.
      const { query } = pushSpy.mock.calls[0][0];
      expect(JSON.parse(decodeURI(query.prevQuery))).toMatchObject({ keywords: 'frac' });
    });

    it('applies a filter combination when the combined suggestion is selected', async () => {
      const combination = {
        type: 'combination',
        filters: [
          { filterKey: 'learning_activities', filterValue: 'PRACTICE', label: 'Practice' },
          { filterKey: 'categories', filterValue: 'MATHVAL', label: 'Mathematics' },
        ],
      };
      renderComponent({
        keywords: 'prac math',
        provides: { autoCompleteSuggestions: ref([combination, ...combination.filters]) },
      });
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      await fireEvent.click(screen.getByTestId('combination-suggestion'));
      expect(mockSelectFilterCombination).toHaveBeenCalledWith(combination.filters);
    });

    it('applies a filter suggestion when it is selected', async () => {
      const suggestion = {
        key: 'PRACTICE',
        label: 'Practice',
        filterKey: 'learning_activities',
        filterValue: 'PRACTICE',
        type: 'activity',
      };
      renderComponent({
        keywords: 'prac',
        provides: { autoCompleteSuggestions: ref([suggestion]) },
      });
      await fireEvent.focus(screen.getByRole('combobox', { name: searchLabel$() }));
      await fireEvent.click(screen.getByText(suggestion.label));
      expect(mockSelectFilterSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({
          filterKey: 'learning_activities',
          filterValue: 'PRACTICE',
        }),
      );
    });
  });

  describe('keyboard navigation', () => {
    it('reflects dropdown visibility via aria-expanded', async () => {
      renderComponent();
      const input = screen.getByRole('combobox', { name: searchLabel$() });
      expect(input).toHaveAttribute('aria-expanded', 'false');
      await fireEvent.focus(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('moves the active option with ArrowDown and selects it on Enter', async () => {
      const item = { id: 'node-4', title: 'Keyboard Result', type: 'content' };
      renderComponent({
        keywords: 'frac',
        provides: { autoCompleteSuggestions: ref([item]) },
      });
      const input = screen.getByRole('combobox', { name: searchLabel$() });
      await fireEvent.focus(input);
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      // The input points at the now-active option.
      expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
      await fireEvent.keyDown(input, { key: 'Enter' });
      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ id: 'node-4' }) }),
      );
    });

    it('returns to the input when ArrowUp is pressed on the first option', async () => {
      renderComponent();
      const input = screen.getByRole('combobox', { name: searchLabel$() });
      await fireEvent.focus(input);
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
      await fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(input.getAttribute('aria-activedescendant')).toBeFalsy();
    });

    it('wraps from the last option back to the input on ArrowDown', async () => {
      // Default render has one history item and one recent search = two options.
      renderComponent();
      const input = screen.getByRole('combobox', { name: searchLabel$() });
      await fireEvent.focus(input);
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
      await fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input.getAttribute('aria-activedescendant')).toBeFalsy();
    });

    it('closes the dropdown on Escape', async () => {
      renderComponent();
      const input = screen.getByRole('combobox', { name: searchLabel$() });
      await fireEvent.focus(input);
      expect(screen.getByText(mockRecentSearch)).toBeInTheDocument();
      await fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByText(mockRecentSearch)).not.toBeInTheDocument();
    });

    it('reopens the dropdown on the next focus after submitting with Enter', async () => {
      renderComponent();
      const input = screen.getByRole('combobox', { name: searchLabel$() });
      // Use the real DOM focus() method rather than fireEvent.focus: jsdom
      // tracks actual focus state through it, so a second call is a genuine
      // no-op unless the component blurred the input in between — exactly
      // the mechanism under test. Vue's reactivity flush isn't wrapped
      // around raw DOM calls the way fireEvent's does, so await nextTick.
      input.focus();
      await nextTick();
      await fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.queryByText(mockRecentSearch)).not.toBeInTheDocument();
      input.focus();
      await nextTick();
      expect(screen.getByText(mockRecentSearch)).toBeInTheDocument();
    });
  });
});
