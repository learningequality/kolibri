import { get, set } from '@vueuse/core';
import { computed, getCurrentInstance, ref, watch } from 'kolibri.lib.vueCompositionApi';
import { ContentNodeResource } from 'kolibri.resources';
import { AllCategories, NoCategories } from 'kolibri.coreVue.vuex.constants';
import { deduplicateResources } from '../utils/contentNode';
import { normalizeContentNode } from '../modules/coreLearn/utils';
import useContentNodeProgress from './useContentNodeProgress';

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

export default function useSearch(store, router) {
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

  let descendant;

  function setSearchWithinDescendant(d) {
    descendant = d;
  }

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
    if (descendant) {
      getParams.tree_id = descendant.tree_id;
      getParams.lft__gt = descendant.lft;
      getParams.rght__lt = descendant.rght;
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
        if (key === 'channels' && descendant) {
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
        set(_results, (data.results || []).map(normalizeContentNode));
        set(more, data.more);
        set(labels, data.labels);
        set(searchLoading, false);
      });
    } else if (descendant) {
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
        set(_results, [...get(_results), ...(data.results || []).map(normalizeContentNode)]);
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

  const results = computed(() => {
    return deduplicateResources(get(_results));
  });

  return {
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
    setSearchWithinDescendant,
  };
}
