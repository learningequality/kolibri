import { ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { Categories } from 'kolibri/constants';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
import HorizontalFilterPills from '../HorizontalFilterPills.vue';

const {
  create$,
  explore$,
  listen$,
  school$,
  dailyLife$,
  basicSkills$,
  mathematics$,
  clearAllAction$,
} = coreStrings;
const { allFilters$ } = searchAndFilterStrings;

const KEYWORD_FILTER = 'hummingbirds';

// Language names come from catalog data, not the translation layer, so they are
// referenced via this fixture rather than a coreStrings key.
const LANGUAGES = [
  { id: 'en', lang_name: 'English' },
  { id: 'es', lang_name: 'Español' },
];

const mockActivities = {
  CREATE: 'UXADWcXZ',
  EXPLORE: '#j8L0eq3',
  LISTEN: 'mkA1R3NU',
};

// Use real category values so label resolution through CategoriesLookup matches
const mockCategories = {
  SCHOOL: {
    value: Categories.SCHOOL,
    nested: {},
  },
  DAILY_LIFE: {
    value: Categories.DAILY_LIFE,
    nested: {},
  },
};

function renderComponent(provides = {}, props = {}) {
  const toggleFilter = jest.fn();
  const clearSearch = jest.fn();
  const utils = render(HorizontalFilterPills, {
    props,
    provide: {
      availableLearningActivities: ref(mockActivities),
      availableLibraryCategories: ref(mockCategories),
      hasGlobalLabels: ref(true),
      searchableLabels: ref(null),
      isFilterActive: () => false,
      isLabelAvailable: () => true,
      appliedFilters: () => [],
      toggleFilter,
      clearSearch,
      searchLoading: ref(false),
      ...provides,
    },
  });
  return { toggleFilter, clearSearch, ...utils };
}

describe('HorizontalFilterPills', () => {
  describe('activity pills', () => {
    it('renders a pill for each available activity', () => {
      renderComponent();
      expect(screen.getAllByTestId('activity-pill')).toHaveLength(3);
      expect(screen.getByRole('button', { name: create$() })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: explore$() })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: listen$() })).toBeInTheDocument();
    });

    it('calls toggleFilter when an activity pill is clicked', async () => {
      const { toggleFilter } = renderComponent();
      await fireEvent.click(screen.getByRole('button', { name: create$() }));
      expect(toggleFilter).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'learning_activities', value: 'UXADWcXZ' }),
      );
    });
  });

  describe('category pills', () => {
    it('renders a pill for each available category', () => {
      renderComponent();
      expect(screen.getAllByTestId('category-pill')).toHaveLength(2);
      expect(screen.getByRole('button', { name: school$() })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: dailyLife$() })).toBeInTheDocument();
    });

    it('calls toggleFilter when a category pill is clicked', async () => {
      const { toggleFilter } = renderComponent();
      await fireEvent.click(screen.getByRole('button', { name: school$() }));
      expect(toggleFilter).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'categories', value: Categories.SCHOOL }),
      );
    });

    it('labels an applied nested subcategory with its translation, not the raw value', () => {
      // Real Mathematics value: a nested subcategory path (School > Mathematics)
      const SUBCATEGORY_VALUE = Categories.MATHEMATICS;
      renderComponent({
        // Only the applied subcategory should render, so the pill under test is unambiguous
        isLabelAvailable: () => false,
        appliedFilters: () => [{ key: 'categories', value: SUBCATEGORY_VALUE }],
        isFilterActive: (key, value) => key === 'categories' && value === SUBCATEGORY_VALUE,
      });
      const pill = screen.getByTestId('category-pill');
      expect(pill).toHaveTextContent(mathematics$());
      expect(screen.queryByText(SUBCATEGORY_VALUE)).not.toBeInTheDocument();
    });
  });

  describe('when no data', () => {
    it('renders no activity pills when activities empty', () => {
      renderComponent({
        availableLearningActivities: ref({}),
      });
      expect(screen.queryAllByTestId('activity-pill')).toHaveLength(0);
    });

    it('renders no category pills when categories empty', () => {
      renderComponent({
        availableLibraryCategories: ref({}),
      });
      expect(screen.queryAllByTestId('category-pill')).toHaveLength(0);
    });
  });

  describe('availability filtering', () => {
    it('hides catalog labels not in searchableLabels', () => {
      renderComponent({
        isLabelAvailable: (key, value) =>
          key === 'learning_activities' ? value === '#j8L0eq3' : false,
      });
      expect(screen.getAllByTestId('activity-pill')).toHaveLength(1);
      expect(screen.getByRole('button', { name: explore$() })).toBeInTheDocument();
      expect(screen.queryAllByTestId('category-pill')).toHaveLength(0);
    });

    it('keeps an active catalog label visible even when not in searchableLabels', () => {
      renderComponent({
        isLabelAvailable: () => false,
        appliedFilters: () => [{ key: 'learning_activities', value: 'UXADWcXZ' }],
        isFilterActive: (key, value) => key === 'learning_activities' && value === 'UXADWcXZ',
      });
      expect(screen.getAllByTestId('activity-pill')).toHaveLength(1);
      expect(screen.getByRole('button', { name: create$() })).toBeInTheDocument();
    });
  });

  describe('applied filters', () => {
    it('renders the keyword as a pill', () => {
      renderComponent({
        appliedFilters: () => [{ key: 'keywords', value: KEYWORD_FILTER }],
        isFilterActive: (key, value) => key === 'keywords' && value === KEYWORD_FILTER,
      });
      expect(screen.getByTestId('keyword-pill')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: KEYWORD_FILTER })).toBeInTheDocument();
    });

    it('renders an active filter from a non-catalog dimension', () => {
      renderComponent({
        appliedFilters: () => [{ key: 'grade_levels', value: 'basic_skills' }],
        isFilterActive: (key, value) => key === 'grade_levels' && value === 'basic_skills',
      });
      expect(screen.getByTestId('grade_levels-pill')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: basicSkills$() })).toBeInTheDocument();
    });

    it('labels an applied language with its name, not the raw code', () => {
      // Language values are codes that coreString cannot resolve; the pill must
      // show the human-readable name from the languages catalog instead.
      const language = LANGUAGES[1];
      renderComponent({
        availableLanguages: ref(LANGUAGES),
        appliedFilters: () => [{ key: 'languages', value: language.id }],
        isFilterActive: (key, value) => key === 'languages' && value === language.id,
      });
      expect(screen.getByTestId('language-pill')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: language.lang_name })).toBeInTheDocument();
      expect(screen.queryByText(language.id)).not.toBeInTheDocument();
    });
  });

  describe('all filters pill', () => {
    it('renders the all filters pill', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: allFilters$() })).toBeInTheDocument();
    });

    it('emits openFilters when the all filters pill is clicked', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByRole('button', { name: allFilters$() }));
      expect(emitted().openFilters).toBeTruthy();
    });

    it('is not rendered when the label catalog is unavailable', () => {
      renderComponent({ hasGlobalLabels: ref(false) });
      expect(screen.queryByRole('button', { name: allFilters$() })).not.toBeInTheDocument();
    });

    it('is not rendered when the search has narrowed every label away', () => {
      renderComponent({
        searchableLabels: ref({ learning_activities: [], categories: [], languages: [] }),
      });
      expect(screen.queryByRole('button', { name: allFilters$() })).not.toBeInTheDocument();
    });
  });

  describe('clear all', () => {
    it('is not rendered when no filters are applied', () => {
      renderComponent();
      expect(screen.queryByRole('button', { name: clearAllAction$() })).not.toBeInTheDocument();
    });

    it('is rendered when a filter is applied', () => {
      renderComponent({
        appliedFilters: () => [{ key: 'learning_activities', value: 'UXADWcXZ' }],
      });
      expect(screen.getByRole('button', { name: clearAllAction$() })).toBeInTheDocument();
    });

    it('clears the whole search when clicked', async () => {
      const { clearSearch } = renderComponent({
        appliedFilters: () => [{ key: 'keywords', value: 'hummingbirds' }],
      });
      await fireEvent.click(screen.getByRole('button', { name: clearAllAction$() }));
      expect(clearSearch).toHaveBeenCalled();
    });
  });
});
