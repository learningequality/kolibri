import { get, set } from '@vueuse/core';
import debounce from 'lodash/debounce';
import invert from 'lodash/invert';
import isEqual from 'lodash/isEqual';
import logger from 'kolibri-logging';
import { computed, inject, onUnmounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import {
  Categories,
  CategoriesLookup,
  ContentLevels,
  AccessibilityCategories,
  LearningActivities,
  ResourcesNeededTypes,
} from 'kolibri/constants';
import useUser from 'kolibri/composables/useUser';
import { currentLanguage } from 'kolibri/utils/i18n';

import Modalities from 'kolibri-constants/Modalities';
import { deduplicateResources } from '../utils/contentNode';
import useFuzzyMetadataSearch from './useFuzzyMetadataSearch';

export const logging = logger.getLogger(__filename);

const activitiesLookup = invert(LearningActivities);

function _generateLearningActivitiesShown(learningActivities) {
  const learningActivitiesShown = {};

  (learningActivities || []).map(id => {
    const key = activitiesLookup[id];
    learningActivitiesShown[key] = id;
  });
  return learningActivitiesShown;
}

const resourcesNeededShown = [
  'FOR_BEGINNERS',
  'PEERS',
  'TEACHER',
  'SPECIAL_SOFTWARE',
  'PAPER_PENCIL',
  'INTERNET',
  'OTHER_SUPPLIES',
];

function _generateResourcesNeeded(learnerNeeds, includeTeacherContent = true) {
  const resourcesNeeded = {};
  resourcesNeededShown
    // The "To use with teachers" need is only relevant to accounts with a role.
    .filter(key => includeTeacherContent || key !== 'TEACHER')
    .map(key => {
      const value = ResourcesNeededTypes[key];
      if (learnerNeeds && learnerNeeds.includes(value)) {
        resourcesNeeded[key] = value;
      }
    });
  return resourcesNeeded;
}

const gradeLevelsShown = [
  'BASIC_SKILLS',
  'PRESCHOOL',
  'LOWER_PRIMARY',
  'UPPER_PRIMARY',
  'LOWER_SECONDARY',
  'UPPER_SECONDARY',
  'TERTIARY',
  'PROFESSIONAL',
  'WORK_SKILLS',
];

function _generateGradeLevelsList(gradeLevels) {
  return gradeLevelsShown.filter(key => {
    return gradeLevels && gradeLevels.includes(ContentLevels[key]);
  });
}

const accessibilityLabelsShown = [
  'SIGN_LANGUAGE',
  'AUDIO_DESCRIPTION',
  'TAGGED_PDF',
  'ALT_TEXT',
  'HIGH_CONTRAST',
  'CAPTIONS_SUBTITLES',
];

function _generateAccessibilityOptionsList(accessibilityLabels) {
  return accessibilityLabelsShown.filter(key => {
    return accessibilityLabels && accessibilityLabels.includes(AccessibilityCategories[key]);
  });
}

// Languages matching the current UI language sort first (exact id match, then
// base-code match), the rest by language code.
function _sortLanguagesByUiMatch(languages) {
  const uiLang = currentLanguage.toLowerCase();
  const uiBase = uiLang.split('-')[0];
  const matchRank = id => {
    const lower = id.toLowerCase();
    if (lower === uiLang) {
      return 2;
    }
    if (lower.split('-')[0] === uiBase) {
      return 1;
    }
    return 0;
  };
  return [...languages].sort(
    (a, b) => matchRank(b.id) - matchRank(a.id) || a.id.localeCompare(b.id),
  );
}

function _generateLibraryCategoriesLookup(categories, includeTeacherContent = true) {
  const libraryCategories = {};

  const availablePaths = {};

  // The "For teachers" category tree is only relevant to accounts with a role.
  const teacherRoot = Categories.FOR_TEACHERS;
  const isTeacherCategory = key => key === teacherRoot || key.startsWith(`${teacherRoot}.`);

  (categories || [])
    .filter(key => includeTeacherContent || !isTeacherCategory(key))
    .map(key => {
      const paths = key.split('.');
      let path = '';
      for (const path_segment of paths) {
        path = path === '' ? path_segment : path + '.' + path_segment;
        availablePaths[path] = true;
      }
    });
  // Create a nested object representing the hierarchy of categories
  for (const value of Object.values(Categories)
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
    for (const fragment of ids) {
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
  return libraryCategories;
}

export const searchKeys = [
  'learning_activities',
  'categories',
  'learner_needs',
  'accessibility_labels',
  'languages',
  'grade_levels',
];

export default function useBaseSearch({
  descendant,
  baseurl,
  filters,
  searchResultsRouteName,
  reloadOnDescendantChange = true,
  fetchContentNodeProgress,
}) {
  const route = useRoute();
  const router = useRouter();

  const searchResultsLoading = ref(false);
  const moreLoading = ref(false);
  const scopedLabelsLoading = ref(false);
  const _results = ref([]);
  const more = ref(null);
  const labels = ref(null);
  const autoCompleteSuggestions = ref([]);

  const { hasRole, isLearnerOnlyImport, isUserLoggedIn } = useUser();

  // On a learn-only device the learner is also the admin of their own device,
  // so a role there does not mean courses should be surfaced to them.
  const showCourses = computed(() => get(hasRole) && !get(isLearnerOnlyImport));

  const searchTerms = computed({
    get() {
      const searchTerms = {};
      const query = route.query;
      for (const key of searchKeys) {
        const obj = {};
        if (query[key]) {
          for (const value of query[key].split(',')) {
            obj[value] = true;
          }
        }
        searchTerms[key] = obj;
      }
      searchTerms.keywords = query.keywords || '';
      return searchTerms;
    },
    set(value) {
      const query = { ...route.query };
      for (const key of searchKeys) {
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

      const nextRoute = { ...route, query };
      if (searchResultsRouteName) {
        nextRoute.name = searchResultsRouteName;
      }
      // Just catch an error from making a redundant navigation rather
      // than try to precalculate this.
      router.push(nextRoute).catch(() => {});
    },
  });

  const displayingSearchResults = computed(() =>
    // Happily this works even for keywords, because calling Object.keys
    // on a string value will give an array of the indexes of a string
    // for an empty string, this array will be empty, meaning that this
    // check still works!
    Object.values(get(searchTerms)).some(v => Object.keys(v).length),
  );

  function _setAvailableLabels(searchableLabels) {
    if (searchableLabels) {
      set(labels, {
        ...searchableLabels,
        languages: searchableLabels.languages ? searchableLabels.languages.map(l => l.id) : [],
      });
    }
  }

  function createBaseSearchGetParams() {
    const role = get(hasRole);
    const courses = get(showCourses);
    const getParams = {
      exclude_modalities: courses ? null : Modalities.COURSE,
      exclude_course_ancestry: !courses,
      include_coach_content: role,
      baseurl: get(baseurl),
    };
    if (filters) {
      Object.assign(getParams, filters);
    }
    const descValue = descendant ? get(descendant) : null;
    if (descValue) {
      getParams.tree_id = descValue.tree_id;
      getParams.lft__gt = descValue.lft;
      getParams.rght__lt = descValue.rght;
    }
    return getParams;
  }

  function createSearchGetParams() {
    const getParams = createBaseSearchGetParams();
    const terms = get(searchTerms);
    for (const key of searchKeys) {
      const keys = Object.keys(terms[key]);
      if (keys.length) {
        getParams[key] = keys;
      }
    }
    if (terms.keywords) {
      // Intentionally ?question=, not ?search= as autocomplete uses: groundwork
      // for the AI assistant integration.
      getParams.question = terms.keywords;
    }
    return getParams;
  }

  function search() {
    const desc = descendant ? get(descendant) : null;
    set(scopedLabelsLoading, true);
    if (get(displayingSearchResults)) {
      // If we're actually displaying search results
      // then we need to load all the search results to display
      set(searchResultsLoading, true);
      const getParams = createSearchGetParams();
      getParams.max_results = 25;
      if (get(isUserLoggedIn)) {
        fetchContentNodeProgress?.(getParams);
      }

      ContentNodeResource.list(getParams).then(data => {
        set(_results, data.results || []);
        set(more, data.more);
        _setAvailableLabels(data.labels);
        set(searchResultsLoading, false);
        set(scopedLabelsLoading, false);
      });
    } else if (desc || filters) {
      const getParams = createBaseSearchGetParams();
      getParams.max_results = 1;
      ContentNodeResource.list(getParams).then(data => {
        _setAvailableLabels(data.labels);
        set(more, null);
        set(scopedLabelsLoading, false);
      });
    } else {
      // Clear labels if no search results displaying
      // and we're not gathering labels from the descendant
      set(more, null);
      set(labels, null);
      set(scopedLabelsLoading, false);
    }
  }

  function searchMore() {
    if (get(displayingSearchResults) && get(more) && !get(moreLoading)) {
      set(moreLoading, true);
      set(scopedLabelsLoading, true);
      if (get(isUserLoggedIn)) {
        fetchContentNodeProgress?.(get(more));
      }
      return ContentNodeResource.list(get(more)).then(data => {
        set(_results, [...get(_results), ...(data.results || [])]);
        set(more, data.more);
        _setAvailableLabels(data.labels);
        set(moreLoading, false);
        set(scopedLabelsLoading, false);
      });
    }
  }

  // Guards against a slower, older request resolving after a newer one and
  // clobbering its results.
  let _suggestionsRequestId = 0;

  const _fetchContentSuggestions = debounce(async (keywordsValue, metadataMatches) => {
    const requestId = ++_suggestionsRequestId;
    try {
      const getParams = createBaseSearchGetParams();
      getParams.search = keywordsValue;
      getParams.max_results = 3;
      getParams.kind = 'content';
      const data = await ContentNodeResource.list(getParams);
      if (requestId !== _suggestionsRequestId) {
        return;
      }
      const contentResults = data.results || [];
      const contentMatches = contentResults.map(r => ({ ...r, type: 'content' }));

      // Combine: metadata first, then content
      set(autoCompleteSuggestions, [...metadataMatches, ...contentMatches]);
    } catch (err) {
      logging.error('Failed to fetch autocomplete content results', err);
    }
  }, 300);
  onUnmounted(() => {
    _fetchContentSuggestions.cancel();
  });

  const keyWordAutoCompleteHandler = keywordsValue => {
    if (!keywordsValue || keywordsValue.length < 2) {
      _fetchContentSuggestions.cancel();
      set(autoCompleteSuggestions, []);
      return;
    }

    // Instant fuzzy match against translated metadata labels; the debounced
    // backend query for content matches follows
    const suggestions = fuzzyMetadataSearch.autoCompleteSuggestions(keywordsValue);
    set(autoCompleteSuggestions, [...suggestions]);
    _fetchContentSuggestions(keywordsValue, suggestions);
  };

  function removeFilterTag({ value, key }) {
    if (key === 'keywords') {
      set(searchTerms, {
        ...get(searchTerms),
        [key]: '',
      });
    } else {
      const keyObject = { ...get(searchTerms)[key] };
      delete keyObject[value];
      set(searchTerms, {
        ...get(searchTerms),
        [key]: keyObject,
      });
    }
  }

  function toggleFilter({ key, value }) {
    // The keyword search term is a free-text string rather than a set, so
    // toggling collapses to "clear it" — the pill represents an applied query
    // and clicking the pill removes that query.
    if (key === 'keywords') {
      set(searchTerms, { ...get(searchTerms), keywords: '' });
      return;
    }
    const current = { ...(get(searchTerms)[key] || {}) };
    if (current[value]) {
      delete current[value];
    } else {
      current[value] = true;
    }
    set(searchTerms, {
      ...get(searchTerms),
      [key]: current,
    });
  }

  function isFilterActive(key, value) {
    const terms = get(searchTerms);
    if (!terms) {
      return false;
    }
    if (key === 'keywords') {
      return Boolean(terms.keywords) && terms.keywords === value;
    }
    return Boolean(terms[key] && terms[key][value]);
  }

  // Flat list of every currently selected term across dimensions, in the order
  // a UI typically wants to render them (keyword first, then everything else).
  // Lets consumers iterate applied filters without rebuilding the same shape
  // from `searchTerms` themselves.
  function appliedFilters() {
    const terms = get(searchTerms) || {};
    const out = [];
    if (terms.keywords) {
      out.push({ key: 'keywords', value: terms.keywords });
    }
    for (const [key, values] of Object.entries(terms)) {
      if (key === 'keywords' || !values || typeof values !== 'object') {
        continue;
      }
      for (const value of Object.keys(values)) {
        if (values[value]) {
          out.push({ key, value });
        }
      }
    }
    return out;
  }

  // Returns true if the given filter value can still yield results within the
  // current search context. Before any search runs, `labels` is null and we
  // treat every value as available.
  function isLabelAvailable(key, value) {
    const scoped = get(labels);
    if (!scoped || !Array.isArray(scoped[key])) {
      return true;
    }
    return scoped[key].includes(value);
  }

  function clearSearch() {
    set(searchTerms, {});
  }

  // Mirror of the keyword search term for binding to a search input, so the
  // input can hold unsubmitted text but follows the applied term when search
  // state changes elsewhere (chip removal, navigation, suggestion selection).
  const keywordsInput = ref(get(searchTerms).keywords || '');

  function setKeywords(value) {
    set(keywordsInput, value);
    set(searchTerms, { ...get(searchTerms), keywords: value });
  }

  function clearKeywords() {
    setKeywords('');
  }

  // Apply an autocomplete filter suggestion: activate the filter and strip
  // the words it matched from the keyword input.
  function selectFilterSuggestion(filter) {
    if (!filter.filterKey || !filter.filterValue) {
      return;
    }
    const current = { ...(get(searchTerms)[filter.filterKey] || {}) };
    current[filter.filterValue] = true;
    const updatedKeywords = fuzzyMetadataSearch.removeMatchedWords(get(keywordsInput), filter);
    set(keywordsInput, updatedKeywords);
    set(searchTerms, {
      ...get(searchTerms),
      [filter.filterKey]: current,
      keywords: updatedKeywords,
    });
  }

  // Apply several autocomplete filter suggestions at once, stripping every word
  // that triggered a match so no partial keyword lingers.
  function selectFilterCombination(filters) {
    const terms = { ...get(searchTerms) };
    let keywords = get(keywordsInput);
    for (const filter of filters) {
      if (!filter.filterKey || !filter.filterValue) {
        continue;
      }
      terms[filter.filterKey] = { ...(terms[filter.filterKey] || {}), [filter.filterValue]: true };
      keywords = fuzzyMetadataSearch.removeMatchedWords(keywords, filter);
    }
    set(keywordsInput, keywords);
    set(searchTerms, { ...terms, keywords });
  }

  watch(searchTerms, (newValue, oldValue) => {
    if (!isEqual(newValue, oldValue)) {
      set(keywordsInput, newValue.keywords || '');
      search();
    }
  });

  if (descendant && reloadOnDescendantChange) {
    watch(descendant, newValue => {
      if (newValue) {
        search();
      }
    });
  }

  // Helper to get the route information in a setup() function
  function currentRoute() {
    return route;
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

  const globalLabels = ref(null);

  const globalLabelsLoading = ref(false);

  const searchLoading = computed(
    () => get(searchResultsLoading) || get(globalLabelsLoading) || get(scopedLabelsLoading),
  );

  function ensureGlobalLabels() {
    set(globalLabelsLoading, true);
    const currentBaseUrl = get(baseurl);
    // The device's baseurl resolves after setup, so the first fetch goes out before
    // it is known and races the one the baseurl watcher starts. Either may land last,
    // so a response is only the current catalog if its baseurl is still the current one.
    const isStale = () => get(baseurl) !== currentBaseUrl;
    ContentNodeResource.list({ max_results: 1, baseurl: currentBaseUrl })
      .then(data => {
        if (isStale()) {
          return;
        }
        const labels = data.labels;
        set(globalLabels, {
          learningActivitiesShown: _generateLearningActivitiesShown(labels.learning_activities),
          libraryCategories: _generateLibraryCategoriesLookup(labels.categories, get(hasRole)),
          resourcesNeeded: _generateResourcesNeeded(labels.learner_needs, get(hasRole)),
          gradeLevelsList: _generateGradeLevelsList(labels.grade_levels || []),
          accessibilityOptionsList: _generateAccessibilityOptionsList(labels.accessibility_labels),
          languagesList: _sortLanguagesByUiMatch(labels.languages || []),
        });
      })
      .catch(err => {
        if (isStale()) {
          return;
        }
        // Offer no filters rather than another device's.
        set(globalLabels, null);
        logging.error('Failed to fetch search labels from remote', err);
      })
      .then(() => {
        if (isStale()) {
          return;
        }
        set(globalLabelsLoading, false);
      });
  }

  ensureGlobalLabels();
  if (baseurl) {
    watch(baseurl, ensureGlobalLabels);
  }

  // Initialize fuzzy metadata search with globalLabels
  const fuzzyMetadataSearch = useFuzzyMetadataSearch(globalLabels);

  function _getGlobalLabels(name, defaultValue) {
    const lookup = get(globalLabels);
    if (lookup) {
      return lookup[name];
    }
    return defaultValue;
  }

  // Every filter option comes from this catalog, so until it has loaded — or if it
  // failed to — there is nothing that could be filtered by.
  const hasGlobalLabels = computed(() => Boolean(get(globalLabels)));

  const learningActivitiesShown = computed(() => {
    return _getGlobalLabels('learningActivitiesShown', {});
  });
  const libraryCategories = computed(() => {
    return _getGlobalLabels('libraryCategories', {});
  });
  const resourcesNeeded = computed(() => {
    return _getGlobalLabels('resourcesNeeded', {});
  });
  const gradeLevelsList = computed(() => {
    return _getGlobalLabels('gradeLevelsList', []);
  });
  const accessibilityOptionsList = computed(() => {
    return _getGlobalLabels('accessibilityOptionsList', []);
  });
  const languagesList = computed(() => {
    return _getGlobalLabels('languagesList', []);
  });

  provide('availableLearningActivities', learningActivitiesShown);
  provide('availableLibraryCategories', libraryCategories);
  provide('availableResourcesNeeded', resourcesNeeded);
  provide('availableGradeLevels', gradeLevelsList);
  provide('availableAccessibilityOptions', accessibilityOptionsList);
  provide('availableLanguages', languagesList);
  provide('hasGlobalLabels', hasGlobalLabels);
  provide('searchLoading', searchLoading);

  // Provide an object of searchable labels
  // This is a manifest of all the labels that could still be selected and produce search results
  // given the currently applied search filters.
  provide('searchableLabels', labels);

  // Currently selected search terms
  provide('activeSearchTerms', searchTerms);

  // Filter helpers — share the same `searchTerms`/`labels` source so any
  // consumer that needs to know "is this filter active?" or "is this label
  // still selectable in the current search?" can ask one place.
  provide('isFilterActive', isFilterActive);
  provide('isLabelAvailable', isLabelAvailable);
  provide('toggleFilter', toggleFilter);
  provide('appliedFilters', appliedFilters);
  provide('clearSearch', clearSearch);

  // Handling for search autocomplete
  provide('keyWordAutoCompleteHandler', keyWordAutoCompleteHandler);
  provide('autoCompleteSuggestions', autoCompleteSuggestions);
  provide('getMatchedWordSegments', fuzzyMetadataSearch.getMatchedWordSegments);

  // Keyword input state and handlers, called directly by search input
  // components rather than round-tripping through page-level events
  provide('keywordsInput', keywordsInput);
  provide('setKeywords', setKeywords);
  provide('clearKeywords', clearKeywords);
  provide('selectFilterSuggestion', selectFilterSuggestion);
  provide('selectFilterCombination', selectFilterCombination);

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
  };
}

/*
 * Helper function to retrieve references for provided properties
 * from an ancestor's use of useBaseSearch
 */
export function injectBaseSearch() {
  const availableLearningActivities = inject('availableLearningActivities');
  const availableLibraryCategories = inject('availableLibraryCategories');
  const availableResourcesNeeded = inject('availableResourcesNeeded');
  const availableGradeLevels = inject('availableGradeLevels');
  const availableAccessibilityOptions = inject('availableAccessibilityOptions');
  const availableLanguages = inject('availableLanguages');
  const hasGlobalLabels = inject('hasGlobalLabels');
  const searchableLabels = inject('searchableLabels');
  const activeSearchTerms = inject('activeSearchTerms');
  const isFilterActive = inject('isFilterActive');
  const isLabelAvailable = inject('isLabelAvailable');
  const toggleFilter = inject('toggleFilter');
  const appliedFilters = inject('appliedFilters');
  const clearSearch = inject('clearSearch');
  const searchLoading = inject('searchLoading');
  const keyWordAutoCompleteHandler = inject('keyWordAutoCompleteHandler');
  const autoCompleteSuggestions = inject('autoCompleteSuggestions');
  const getMatchedWordSegments = inject('getMatchedWordSegments');
  const keywordsInput = inject('keywordsInput');
  const setKeywords = inject('setKeywords');
  const clearKeywords = inject('clearKeywords');
  const selectFilterSuggestion = inject('selectFilterSuggestion');
  const selectFilterCombination = inject('selectFilterCombination');
  return {
    availableLearningActivities,
    availableLibraryCategories,
    availableResourcesNeeded,
    availableGradeLevels,
    availableAccessibilityOptions,
    availableLanguages,
    hasGlobalLabels,
    searchableLabels,
    activeSearchTerms,
    isFilterActive,
    isLabelAvailable,
    toggleFilter,
    appliedFilters,
    clearSearch,
    searchLoading,
    keyWordAutoCompleteHandler,
    autoCompleteSuggestions,
    getMatchedWordSegments,
    keywordsInput,
    setKeywords,
    clearKeywords,
    selectFilterSuggestion,
    selectFilterCombination,
  };
}
