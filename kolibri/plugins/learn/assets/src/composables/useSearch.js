import { get, set } from '@vueuse/core';
import { computed, ref, watch } from 'kolibri.lib.vueCompositionApi';
import { ContentNodeResource } from 'kolibri.resources';
import { AllCategories, NoCategories } from 'kolibri.coreVue.vuex.constants';
import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import { normalizeContentNode } from '../modules/coreLearn/utils';

const searchKeys = [
  'learning_activities',
  'categories',
  'learner_needs',
  'channels',
  'accessibility_labels',
  'languages',
  'grade_levels',
];

export default function useSearch() {
  const route = computed(() => store.state.route);

  const searchLoading = ref(true);
  const moreLoading = ref(false);
  const results = ref([]);
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
      if (query.keywords) {
        searchTerms.keywords = query.keywords;
      }
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
    Object.values(get(searchTerms)).some(v => Object.keys(v).length)
  );

  function search() {
    const getParams = {};
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
          if (key === 'channels' && descendant) {
            continue;
          }
        }
        const keys = Object.keys(terms[key]);
        if (keys.length) {
          getParams[key] = keys;
        }
      }
      if (terms.keywords) {
        getParams.keywords = terms.keywords;
      }
      ContentNodeResource.fetchCollection({ getParams }).then(data => {
        set(results, data.results.map(normalizeContentNode));
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
      ContentNodeResource.fetchCollection({ getParams: get(more) }).then(data => {
        set(results, [...get(results), ...data.results.map(normalizeContentNode)]);
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
    set(searchTerms, { ...this.searchTerms, categories: { [category]: true } });
  }

  watch(searchTerms, search);

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
