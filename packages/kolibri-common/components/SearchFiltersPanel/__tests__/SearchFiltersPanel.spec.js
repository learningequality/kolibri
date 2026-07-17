import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import SearchFiltersPanel from '../index.vue';

const { keywords$ } = createTranslator(SearchFiltersPanel.name, SearchFiltersPanel.$trs);

const defaultSearchTerms = {
  learning_activities: {},
  learner_needs: {},
  accessibility_labels: {},
  languages: {},
  grade_levels: {},
  categories: {},
  keywords: '',
};

function renderComponent(props = {}) {
  return render(SearchFiltersPanel, {
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
});
