import { render, screen, fireEvent, within } from '@testing-library/vue';
import SearchAutocompleteDropdown from '../SearchAutocompleteDropdown.vue';

// Use encoded activity values matching the API format (from LearningActivities constants)
const WATCH_VALUE = 'UD5UGM0z';
const READ_VALUE = 'wA01urpi';

const mockHistoryItems = [
  {
    id: 'node-1',
    title: 'The Square Root Concept',
    learning_activities: [WATCH_VALUE],
    channel_title: 'Khan Academy',
  },
  {
    id: 'node-2',
    title: 'Understanding Fractions',
    learning_activities: [READ_VALUE],
    channel_title: 'CK-12',
  },
];

const mockRecentSearches = ['fraction videos', 'fraction video for kids'];

const mockSuggestions = [
  {
    id: 'node-3',
    title: 'Fraction Basics',
    type: 'content',
    learning_activities: [WATCH_VALUE],
  },
  {
    key: 'PRACTICE',
    label: 'Practice',
    filterKey: 'learning_activities',
    filterValue: 'PRACTICE',
    type: 'activity',
  },
];

const mockCombination = {
  type: 'combination',
  filters: [
    {
      key: 'PRACTICE',
      label: 'Practice',
      filterKey: 'learning_activities',
      filterValue: 'PRACTICE',
      type: 'activity',
    },
    {
      key: 'MATHEMATICS',
      label: 'Mathematics',
      filterKey: 'categories',
      filterValue: 'MATHVAL',
      type: 'category',
    },
  ],
};

function renderComponent(props = {}) {
  return render(SearchAutocompleteDropdown, {
    props: {
      show: true,
      query: '',
      suggestions: [],
      historyItems: [],
      recentSearches: [],
      ...props,
    },
  });
}

describe('SearchAutocompleteDropdown', () => {
  describe('visibility', () => {
    it('is hidden when show is false', () => {
      renderComponent({ show: false });
      expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
    });

    it('is visible when show is true', () => {
      renderComponent({ show: true });
      expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
    });
  });

  describe('focus state (no query)', () => {
    it('renders history section when history items exist', () => {
      renderComponent({ historyItems: mockHistoryItems });
      expect(screen.getByTestId('history-section')).toBeInTheDocument();
    });

    it('renders history items', () => {
      renderComponent({ historyItems: mockHistoryItems });
      expect(screen.getAllByTestId('history-item')).toHaveLength(2);
      expect(screen.getByText(mockHistoryItems[0].title)).toBeInTheDocument();
      expect(screen.getByText(mockHistoryItems[1].title)).toBeInTheDocument();
    });

    it('renders the activity tag for each history item as its translated label', () => {
      renderComponent({ historyItems: mockHistoryItems });
      const items = screen.getAllByTestId('history-item');
      // Each item carries a single learning-activity tag; it must show the
      // translated label ("Watch"/"Read"), never the opaque API value.
      expect(within(items[0]).getByTestId('metadata-tag')).toHaveTextContent(/^Watch$/);
      expect(within(items[1]).getByTestId('metadata-tag')).toHaveTextContent(/^Read$/);
      // The opaque value must not leak into the rendered output at all.
      expect(screen.queryByText(WATCH_VALUE)).not.toBeInTheDocument();
    });

    it('renders recent searches section when recent searches exist', () => {
      renderComponent({ recentSearches: mockRecentSearches });
      expect(screen.getByTestId('recent-searches-section')).toBeInTheDocument();
    });

    it('renders recent search items', () => {
      renderComponent({ recentSearches: mockRecentSearches });
      expect(screen.getAllByTestId('recent-search-item')).toHaveLength(2);
      expect(screen.getByText(mockRecentSearches[0])).toBeInTheDocument();
      expect(screen.getByText(mockRecentSearches[1])).toBeInTheDocument();
    });

    it('emits selectContent when a history item is clicked', async () => {
      const { emitted } = renderComponent({ historyItems: mockHistoryItems });
      await fireEvent.click(screen.getByText(mockHistoryItems[0].title));
      expect(emitted().selectContent).toBeTruthy();
      expect(emitted().selectContent[0][0]).toEqual(mockHistoryItems[0]);
    });

    it('emits selectSearch when a recent search is clicked', async () => {
      const { emitted } = renderComponent({ recentSearches: mockRecentSearches });
      await fireEvent.click(screen.getByText(mockRecentSearches[0]));
      expect(emitted().selectSearch).toBeTruthy();
      expect(emitted().selectSearch[0][0]).toBe(mockRecentSearches[0]);
    });

    it('renders nothing when no history or recent searches', () => {
      renderComponent();
      expect(screen.queryAllByTestId('history-item')).toHaveLength(0);
      expect(screen.queryAllByTestId('recent-search-item')).toHaveLength(0);
    });
  });

  describe('typing state (has query)', () => {
    it('renders suggestion items', () => {
      renderComponent({
        query: 'frac',
        suggestions: mockSuggestions,
      });
      expect(screen.getByText(mockSuggestions[0].title)).toBeInTheDocument();
      expect(screen.getByText(mockSuggestions[1].label)).toBeInTheDocument();
    });

    it('does not render history or recent searches when query is present', () => {
      renderComponent({
        query: 'frac',
        suggestions: mockSuggestions,
        historyItems: mockHistoryItems,
        recentSearches: mockRecentSearches,
      });
      expect(screen.queryByTestId('history-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('recent-searches-section')).not.toBeInTheDocument();
    });

    it('emits selectContent when a content suggestion is clicked', async () => {
      const { emitted } = renderComponent({
        query: 'frac',
        suggestions: mockSuggestions,
      });
      await fireEvent.click(screen.getByText(mockSuggestions[0].title));
      expect(emitted().selectContent).toBeTruthy();
      expect(emitted().selectContent[0][0]).toMatchObject({ id: 'node-3' });
    });

    it('emits selectFilter when a metadata suggestion is clicked', async () => {
      const { emitted } = renderComponent({
        query: 'frac',
        suggestions: mockSuggestions,
      });
      await fireEvent.click(screen.getByText(mockSuggestions[1].label));
      expect(emitted().selectFilter).toBeTruthy();
      expect(emitted().selectFilter[0][0]).toMatchObject({
        filterKey: 'learning_activities',
        filterValue: 'PRACTICE',
      });
    });

    it('renders no suggestion items when there are no suggestions', () => {
      renderComponent({
        query: 'xyznoexist',
        suggestions: [],
      });
      expect(screen.queryAllByTestId('suggestion-item')).toHaveLength(0);
    });

    it('renders a combined suggestion first, showing every matched filter', () => {
      renderComponent({
        query: 'prac math',
        suggestions: [mockCombination, ...mockCombination.filters],
      });
      const combined = screen.getByTestId('combination-suggestion');
      expect(combined).toHaveTextContent('Practice');
      expect(combined).toHaveTextContent('Mathematics');
      // It is the first option in the listbox.
      expect(screen.getAllByRole('option')[0]).toBe(combined);
    });

    it('emits selectCombination when the combined suggestion is clicked', async () => {
      const { emitted } = renderComponent({
        query: 'prac math',
        suggestions: [mockCombination, ...mockCombination.filters],
      });
      await fireEvent.click(screen.getByTestId('combination-suggestion'));
      expect(emitted().selectCombination).toBeTruthy();
      expect(emitted().selectCombination[0][0]).toMatchObject({ type: 'combination' });
    });
  });

  describe('accessibility', () => {
    it('exposes the dropdown as a listbox with options', () => {
      renderComponent({
        historyItems: mockHistoryItems,
      });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    it('marks the active row as selected for aria-activedescendant', () => {
      renderComponent({
        historyItems: mockHistoryItems,
        listboxId: 'lb',
        activeIndex: 1,
      });
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      // The selected option carries the id the input points at.
      expect(options[1]).toHaveAttribute('id', 'lb-option-1');
    });

    it('groups sections so the heading is not an invalid listbox child', () => {
      renderComponent({
        historyItems: mockHistoryItems,
        recentSearches: mockRecentSearches,
      });
      // listbox may only own option/group children; each labelled section is a
      // group and its visible heading is hidden from the accessibility tree.
      expect(screen.getAllByRole('group')).toHaveLength(2);
      expect(screen.getByTestId('history-section')).toHaveAttribute('role', 'group');
      const heading = screen.getByTestId('history-section').querySelector('.section-header');
      expect(heading).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps filter-suggestion pills out of the tab order', () => {
      renderComponent({
        query: 'frac',
        suggestions: mockSuggestions,
      });
      // Focus stays on the combobox input; options are reached via
      // aria-activedescendant, not Tab.
      expect(screen.getByTestId('filter-suggestion-pill')).toHaveAttribute('tabindex', '-1');
    });
  });
});
