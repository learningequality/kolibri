import { computed, nextTick, ref } from 'vue';
import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { Categories, LearningActivities } from 'kolibri/constants';
import { coreString, coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { createTranslator } from 'kolibri/utils/i18n';
import SearchFiltersPanel from '../index.vue';

const { keywords$ } = createTranslator(SearchFiltersPanel.name, SearchFiltersPanel.$trs);
const { watch$ } = coreStrings;

const emptyLabels = {
  learning_activities: [],
  categories: [],
  learner_needs: [],
  accessibility_labels: [],
  languages: [],
  grade_levels: [],
};

const defaultSearchTerms = {
  learning_activities: {},
  learner_needs: {},
  accessibility_labels: {},
  languages: {},
  grade_levels: {},
  categories: {},
  keywords: '',
};

function renderComponent(props = {}, injected = {}, component = SearchFiltersPanel) {
  return render(component, {
    props: {
      ...props,
    },
    provide: {
      availableLearningActivities: ref({}),
      availableLibraryCategories: ref({}),
      availableResourcesNeeded: ref({}),
      availableGradeLevels: ref([]),
      availableAccessibilityOptions: ref([]),
      availableLanguages: ref([]),
      searchableLabels: ref(null),
      // SearchFiltersPanel drives its model from the injected search terms.
      activeSearchTerms: ref({ ...defaultSearchTerms }),
      searchLoading: ref(false),
      ...injected,
    },
  });
}

describe('SearchFiltersPanel', () => {
  describe('hideKeywords prop', () => {
    it('shows the keywords section by default', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: keywords$() })).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('hides the keywords section when hideKeywords is true', () => {
      renderComponent({ hideKeywords: true });
      expect(screen.queryByRole('heading', { name: keywords$() })).not.toBeInTheDocument();
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });
  });

  describe('activity buttons', () => {
    function renderWithWatch(injected = {}) {
      const activeSearchTerms = ref({ ...defaultSearchTerms });
      const searchLoading = ref(false);
      renderComponent(
        {},
        {
          availableLearningActivities: ref({ WATCH: LearningActivities.WATCH }),
          activeSearchTerms,
          searchLoading,
          ...injected,
        },
      );
      return {
        activeSearchTerms,
        searchLoading,
        watch: screen.getByRole('button', { name: watch$() }),
      };
    }

    it('keeps the button enabled while the search loads so a keyboard toggle does not lose focus', async () => {
      const { searchLoading, watch } = renderWithWatch();
      searchLoading.value = true;
      await nextTick();
      expect(watch).toBeEnabled();
    });

    it('marks the button aria-disabled while the search loads', async () => {
      const { searchLoading, watch } = renderWithWatch();
      searchLoading.value = true;
      await nextTick();
      expect(watch).toHaveAttribute('aria-disabled', 'true');
    });

    it('ignores activation while the search loads', async () => {
      const { activeSearchTerms, searchLoading, watch } = renderWithWatch();
      searchLoading.value = true;
      await nextTick();
      await userEvent.click(watch);
      expect(activeSearchTerms.value.learning_activities).toEqual({});
    });

    it('toggles the activity when activated', async () => {
      const { activeSearchTerms, watch } = renderWithWatch();
      await userEvent.click(watch);
      expect(activeSearchTerms.value.learning_activities).toEqual({
        [LearningActivities.WATCH]: true,
      });
    });

    it('keeps focus on an activity turned off by keyboard that the results no longer offer', async () => {
      const searchableLabels = ref({ ...emptyLabels, learning_activities: [] });
      const { activeSearchTerms, watch } = renderWithWatch({ searchableLabels });
      activeSearchTerms.value = {
        ...defaultSearchTerms,
        learning_activities: { [LearningActivities.WATCH]: true },
      };
      await nextTick();
      watch.focus();
      await userEvent.keyboard('{Enter}');
      expect(activeSearchTerms.value.learning_activities).toEqual({});
      searchableLabels.value = { ...emptyLabels, learning_activities: [LearningActivities.READ] };
      await nextTick();
      expect(watch).toBeEnabled();
      expect(watch).toHaveFocus();
    });

    it('marks an activity the results do not offer aria-disabled and ignores activation', async () => {
      const { activeSearchTerms, watch } = renderWithWatch({
        searchableLabels: ref({ ...emptyLabels, learning_activities: [] }),
      });
      expect(watch).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(watch);
      expect(activeSearchTerms.value.learning_activities).toEqual({});
    });
  });

  describe('category buttons', () => {
    async function renderWithCategories(injected = {}, component) {
      const activeSearchTerms = ref({ ...defaultSearchTerms });
      const searchLoading = ref(false);
      renderComponent(
        {},
        {
          availableLibraryCategories: ref({
            SCHOOL: {
              value: Categories.SCHOOL,
              nested: {
                MATHEMATICS: { value: Categories.MATHEMATICS, nested: {} },
              },
            },
            DAILY_LIFE: { value: Categories.DAILY_LIFE, nested: {} },
          }),
          activeSearchTerms,
          searchLoading,
          ...injected,
        },
        component,
      );
      await nextTick();
      return { activeSearchTerms, searchLoading };
    }

    function categoryButton(category) {
      return screen.getByRole('button', { name: coreString(category) });
    }

    it('keeps focus on a category toggled by keyboard while the search loads', async () => {
      const { activeSearchTerms, searchLoading } = await renderWithCategories();
      categoryButton(Categories.DAILY_LIFE).focus();
      await userEvent.keyboard('{Enter}');
      expect(activeSearchTerms.value.categories).toEqual({ [Categories.DAILY_LIFE]: true });
      searchLoading.value = true;
      await nextTick();
      expect(categoryButton(Categories.DAILY_LIFE)).toBeEnabled();
      expect(categoryButton(Categories.DAILY_LIFE)).toHaveFocus();
      searchLoading.value = false;
      await nextTick();
      expect(categoryButton(Categories.DAILY_LIFE)).toHaveFocus();
    });

    it('marks the buttons aria-disabled and ignores activation while the search loads', async () => {
      const { activeSearchTerms, searchLoading } = await renderWithCategories();
      searchLoading.value = true;
      await nextTick();
      expect(categoryButton(Categories.DAILY_LIFE)).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(categoryButton(Categories.DAILY_LIFE));
      expect(activeSearchTerms.value.categories).toEqual({});
    });

    it('keeps focus on a category turned off by keyboard that the results no longer offer', async () => {
      const searchableLabels = ref({ ...emptyLabels, categories: [Categories.DAILY_LIFE] });
      const { activeSearchTerms } = await renderWithCategories({ searchableLabels });
      categoryButton(Categories.DAILY_LIFE).focus();
      await userEvent.keyboard('{Enter}');
      expect(activeSearchTerms.value.categories).toEqual({ [Categories.DAILY_LIFE]: true });
      await userEvent.keyboard('{Enter}');
      expect(activeSearchTerms.value.categories).toEqual({});
      searchableLabels.value = { ...emptyLabels, categories: [Categories.SCHOOL] };
      await nextTick();
      expect(categoryButton(Categories.DAILY_LIFE)).toBeEnabled();
      expect(categoryButton(Categories.DAILY_LIFE)).toHaveFocus();
    });

    it('marks a category the results do not offer aria-disabled and ignores activation', async () => {
      const { activeSearchTerms } = await renderWithCategories({
        searchableLabels: ref({ ...emptyLabels, categories: [Categories.SCHOOL] }),
      });
      expect(categoryButton(Categories.DAILY_LIFE)).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(categoryButton(Categories.DAILY_LIFE));
      expect(activeSearchTerms.value.categories).toEqual({});
    });

    it('focuses the top-level category after a subcategory is picked', async () => {
      const { activeSearchTerms, searchLoading } = await renderWithCategories();
      await userEvent.click(categoryButton(Categories.SCHOOL));
      const mathematics = coreString('mathematics');
      await userEvent.click(
        within(screen.getByRole('heading', { name: mathematics })).getByText(mathematics),
      );
      expect(activeSearchTerms.value.categories).toEqual({ [Categories.MATHEMATICS]: true });
      searchLoading.value = true;
      await nextTick();
      searchLoading.value = false;
      await nextTick();
      expect(categoryButton(Categories.SCHOOL)).toHaveFocus();
    });

    it('applies a subcategory whose pick unmounts the panel', async () => {
      const shown = ref(true);
      const terms = ref({ ...defaultSearchTerms });
      const activeSearchTerms = computed({
        get: () => terms.value,
        set: value => {
          terms.value = value;
          shown.value = false;
        },
      });
      await renderWithCategories(
        { activeSearchTerms },
        { name: 'ResultsHost', render: h => (shown.value ? h(SearchFiltersPanel) : h('div')) },
      );
      await userEvent.click(categoryButton(Categories.SCHOOL));
      const mathematics = coreString('mathematics');
      await userEvent.click(
        within(screen.getByRole('heading', { name: mathematics })).getByText(mathematics),
      );
      await nextTick();
      expect(terms.value.categories).toEqual({ [Categories.MATHEMATICS]: true });
      expect(
        screen.queryByRole('button', { name: coreString(Categories.SCHOOL) }),
      ).not.toBeInTheDocument();
    });
  });
});
