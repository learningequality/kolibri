import { get, set } from '@vueuse/core';
import invert from 'lodash/invert';
import pick from 'lodash/pick';
import uniq from 'lodash/uniq';
import {
  computed,
  getCurrentInstance,
  inject,
  provide,
  ref,
  watch,
} from 'kolibri.lib.vueCompositionApi';
import { ContentNodeResource } from 'kolibri.resources';
import {
  AllCategories,
  Categories,
  CategoriesLookup,
  ContentLevels,
  AccessibilityCategories,
  LearningActivities,
  NoCategories,
  ResourcesNeededTypes,
} from 'kolibri.coreVue.vuex.constants';
import { deduplicateResources } from '../utils/contentNode';
import useContentNodeProgress from './useContentNodeProgress';
import plugin_data from 'plugin_data';

const activitiesLookup = invert(LearningActivities);

const learningActivitiesShown = {};

(plugin_data.learningActivities || []).map(id => {
  const key = activitiesLookup[id];
  learningActivitiesShown[key] = id;
});

const resourcesNeededShown = ['FOR_BEGINNERS', 'PEOPLE', 'PAPER_PENCIL', 'INTERNET', 'MATERIALS'];

const resourcesNeeded = {};
resourcesNeededShown.map(key => {
  const value = ResourcesNeededTypes[key];
  if ((plugin_data.learnerNeeds || []).includes(value)) {
    resourcesNeeded[key] = value;
  }
});

const gradeLevelsList = Object.keys(ContentLevels).filter(key => {
  const value = ContentLevels[key];
  return (get(plugin_data, 'gradeLevels', []) || []).includes(value);
});

const accessibilityOptionsList = Object.keys(AccessibilityCategories).filter(key => {
  const value = AccessibilityCategories[key];
  return (get(plugin_data, 'accessibilityLabels', []) || []).includes(value);
});

const languagesList = get(plugin_data, 'languages', []) || [];

const channelsList = get(plugin_data, 'channels', []) || [];

const libraryCategoriesList = pick(
  CategoriesLookup,
  uniq((plugin_data.categories || []).map(key => key.split('.')[0]))
);

const libraryCategories = {};

const availablePaths = {};

(plugin_data.categories || []).map(key => {
  const paths = key.split('.');
  let path = '';
  for (let path_segment of paths) {
    path = path === '' ? path_segment : path + '.' + path_segment;
    availablePaths[path] = true;
  }
});
// Create a nested object representing the hierarchy of categories
for (let value of Object.values(Categories)
  // Sort by the length of the key path to deal with
  // shorter key paths first.
  .sort((a, b) => a.length - b.length)) {
  // Split the value into the paths so we can build the object
  // down the path to create the nested representation
  const ids = value.split('.');
  // Start with an empty path
  let path = '';
  // Start with the global object
  let nested = libraryCategories;
  for (let fragment of ids) {
    // Add the fragment to create the path we examine
    path += fragment;
    // Check to see if this path is one of the paths
    // that is available on this device
    if (availablePaths[path]) {
      // Lookup the human readable key for this path
      const nestedKey = CategoriesLookup[path];
      // Check if we have already represented this in the object
      if (!nested[nestedKey]) {
        // If not, add an object representing this category
        nested[nestedKey] = {
          // The value is the whole path to this point, so the value
          // of the key.
          value: path,
          // Nested is an object that contains any subsidiary categories
          nested: {},
        };
      }
      // For the next stage of the loop the relevant object to edit is
      // the nested object under this key.
      nested = nested[nestedKey].nested;
      // Add '.' to path so when we next append to the path,
      // it is properly '.' separated.
      path += '.';
    } else {
      break;
    }
  }
}

export const searchKeys = [
  'learning_activities',
  'categories',
  'learner_needs',
  'channels',
  'accessibility_labels',
  'languages',
  'grade_levels',
];

const { fetchContentNodeProgress } = useContentNodeProgress();

export default function useSearch(descendant, store, router) {
  // Get store and router references from the curent instance
  // but allow them to be passed in to allow for dependency
  // injection, primarily for tests.
  store = store || getCurrentInstance().proxy.$store;
  router = router || getCurrentInstance().proxy.$router;
  const route = computed(() => store.state.route);

  const searchLoading = ref(false);
  const moreLoading = ref(false);
  const _results = ref([]);
  const more = ref(null);
  const labels = ref(null);

  const searchTerms = computed({
    get() {
      const searchTerms = {};
      const query = get(route).query;
      for (let key of searchKeys) {
        const obj = {};
        if (query[key]) {
          for (let value of query[key].split(',')) {
            obj[value] = true;
          }
        }
        searchTerms[key] = obj;
      }
      searchTerms.keywords = query.keywords || '';
      return searchTerms;
    },
    set(value) {
      const query = { ...get(route).query };
      for (let key of searchKeys) {
        const val = Object.keys(value[key] || {})
          .filter(Boolean)
          .join(',');
        if (val.length) {
          query[key] = Object.keys(value[key]).join(',');
        } else {
          delete query[key];
        }
      }
      if (value.keywords && value.keywords.length) {
        query.keywords = value.keywords;
      } else {
        delete query.keywords;
      }
      // Just catch an error from making a redundant navigation rather
      // than try to precalculate this.
      router.push({ ...get(route), query }).catch(() => {});
    },
  });

  const displayingSearchResults = computed(() =>
    // Happily this works even for keywords, because calling Object.keys
    // on a string value will give an array of the indexes of a string
    // for an empty string, this array will be empty, meaning that this
    // check still works!
    Object.values(get(searchTerms)).some(v => Object.keys(v).length)
  );

  function search() {
    const getParams = {
      include_coach_content:
        store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
    };
    const descValue = descendant ? get(descendant) : null;
    if (descValue) {
      getParams.tree_id = descValue.tree_id;
      getParams.lft__gt = descValue.lft;
      getParams.rght__lt = descValue.rght;
    }
    if (get(displayingSearchResults)) {
      getParams.max_results = 25;
      const terms = get(searchTerms);
      set(searchLoading, true);
      for (let key of searchKeys) {
        if (key === 'categories') {
          if (terms[key][AllCategories]) {
            getParams['categories__isnull'] = false;
            continue;
          } else if (terms[key][NoCategories]) {
            getParams['categories__isnull'] = true;
            continue;
          }
        }
        if (key === 'channels' && descValue) {
          continue;
        }
        const keys = Object.keys(terms[key]);
        if (keys.length) {
          getParams[key] = keys;
        }
      }
      if (terms.keywords) {
        getParams.keywords = terms.keywords;
      }
      if (store.getters.isUserLoggedIn) {
        fetchContentNodeProgress(getParams);
      }
      ContentNodeResource.fetchCollection({ getParams }).then(data => {
        set(_results, data.results || []);
        set(more, data.more);
        set(labels, data.labels);
        set(searchLoading, false);
      });
    } else if (descValue) {
      getParams.max_results = 1;
      ContentNodeResource.fetchCollection({ getParams }).then(data => {
        set(labels, data.labels);
        set(more, null);
      });
    } else {
      // Clear labels if no search results displaying
      // and we're not gathering labels from the descendant
      set(more, null);
      set(labels, null);
    }
  }

  function searchMore() {
    if (get(displayingSearchResults) && get(more) && !get(moreLoading)) {
      set(moreLoading, true);
      if (store.getters.isUserLoggedIn) {
        fetchContentNodeProgress(get(more));
      }
      return ContentNodeResource.fetchCollection({ getParams: get(more) }).then(data => {
        set(_results, [...get(_results), ...(data.results || [])]);
        set(more, data.more);
        set(labels, data.labels);
        set(moreLoading, false);
      });
    }
  }

  function removeFilterTag({ value, key }) {
    if (key === 'keywords') {
      set(searchTerms, {
        ...get(searchTerms),
        [key]: '',
      });
    } else {
      const keyObject = get(searchTerms)[key];
      delete keyObject[value];
      set(searchTerms, {
        ...get(searchTerms),
        [key]: keyObject,
      });
    }
  }

  function clearSearch() {
    set(searchTerms, {});
  }

  function setCategory(category) {
    set(searchTerms, { ...get(searchTerms), categories: { [category]: true } });
  }

  watch(searchTerms, search);

  if (descendant) {
    watch(descendant, newValue => {
      if (newValue) {
        search();
      }
    });
  }

  // Helper to get the route information in a setup() function
  function currentRoute() {
    return get(route);
  }

  const results = computed(() => {
    return deduplicateResources(get(_results));
  });

  // Globally available metadata labels
  // These are the labels that are available globally for this search context
  // These labels may be disabled for specific searches within a search context
  // We use provide/inject here to allow a parent
  // component to setup the available labels for child components
  // to consume them.

  provide('availableLearningActivities', learningActivitiesShown);
  provide('availableLibraryCategories', libraryCategoriesList);
  provide('availableLibraryCategoriesLookup', libraryCategories);
  provide('availableResourcesNeeded', resourcesNeeded);
  provide('availableGradeLevels', gradeLevelsList);
  provide('availableAccessibilityOptions', accessibilityOptionsList);
  provide('availableLanguages', languagesList);
  provide('availableChannels', channelsList);

  // Provide an object of searchable labels
  // This is a manifest of all the labels that could still be selected and produce search results
  // given the currently applied search filters.
  provide('searchableLabels', labels);

  // Currently selected search terms
  provide('activeSearchTerms', searchTerms);

  return {
    currentRoute,
    searchTerms,
    displayingSearchResults,
    searchLoading,
    moreLoading,
    results,
    more,
    labels,
    search,
    searchMore,
    removeFilterTag,
    clearSearch,
    setCategory,
  };
}

/*
 * Helper function to retrieve references for provided properties
 * from an ancestor's use of useSearch
 */
export function injectSearch() {
  const availableLearningActivities = inject('availableLearningActivities');
  const availableLibraryCategories = inject('availableLibraryCategories');
  const availableLibraryCategoriesLookup = inject('availableLibraryCategoriesLookup');
  const availableResourcesNeeded = inject('availableResourcesNeeded');
  const availableGradeLevels = inject('availableGradeLevels');
  const availableAccessibilityOptions = inject('availableAccessibilityOptions');
  const availableLanguages = inject('availableLanguages');
  const availableChannels = inject('availableChannels');
  const searchableLabels = inject('searchableLabels');
  const activeSearchTerms = inject('activeSearchTerms');
  return {
    availableLearningActivities,
    availableLibraryCategories,
    availableLibraryCategoriesLookup,
    availableResourcesNeeded,
    availableGradeLevels,
    availableAccessibilityOptions,
    availableLanguages,
    availableChannels,
    searchableLabels,
    activeSearchTerms,
  };
}
