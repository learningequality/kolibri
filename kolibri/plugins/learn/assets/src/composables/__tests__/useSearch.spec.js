import { get, set } from '@vueuse/core';
import VueRouter from 'vue-router';
import Vue, { nextTick, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { coreStoreFactory } from 'kolibri/store';
import { AllCategories, NoCategories } from 'kolibri/constants';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSearch from '../useSearch';
import coreModule from '../../../../../../core/assets/src/state/modules/core';

Vue.use(VueRouter);

jest.mock('kolibri/composables/useUser');

const name = 'not important';

function prep(query = {}, descendant = null) {
  const store = coreStoreFactory({
    state: () => ({
      route: {
        query,
        name,
      },
    }),
    mutations: {
      SET_QUERY(state, query) {
        state.route.query = query;
      },
    },
  });
  store.registerModule('core', coreModule);
  const router = new VueRouter();
  router.push = jest.fn().mockReturnValue(Promise.resolve());
  return {
    ...useSearch(descendant, store, router),
    router,
    store,
  };
}

describe(`useSearch`, () => {
  beforeEach(() => {
    ContentNodeResource.fetchCollection = jest.fn();
    ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
    useUser.mockImplementation(() => useUserMock());
  });
  describe(`searchTerms computed ref`, () => {
    it(`returns an object with all relevant keys when query params are empty`, () => {
      const { searchTerms } = prep();
      expect(get(searchTerms)).toEqual({
        accessibility_labels: {},
        categories: {},
        grade_levels: {},
        languages: {},
        learner_needs: {},
        learning_activities: {},
        keywords: '',
      });
    });
    it(`returns an object with all relevant keys when query params have other keys`, () => {
      const { searchTerms } = prep({
        search: {
          this: true,
        },
        keyword: 'how about this?',
      });
      expect(get(searchTerms)).toEqual({
        accessibility_labels: {},
        categories: {},
        grade_levels: {},
        languages: {},
        learner_needs: {},
        learning_activities: {},
        keywords: '',
      });
    });
    it(`returns an object with all relevant keys when query params are specified`, () => {
      const { searchTerms } = prep({
        accessibility_labels: 'test1,test2',
        keywords: 'I love paris in the springtime!',
        categories: 'notatest,reallynotatest,absolutelynotatest',
        grade_levels: 'lowerprimary,uppersecondary,adult',
        languages: 'ar-jk,en-pr,en-gb',
        learner_needs: 'internet,pencil,rolodex',
        learning_activities: 'watch',
      });
      expect(get(searchTerms)).toEqual({
        accessibility_labels: {
          test1: true,
          test2: true,
        },
        categories: {
          notatest: true,
          reallynotatest: true,
          absolutelynotatest: true,
        },
        grade_levels: {
          lowerprimary: true,
          uppersecondary: true,
          adult: true,
        },
        languages: {
          'ar-jk': true,
          'en-pr': true,
          'en-gb': true,
        },
        learner_needs: {
          internet: true,
          pencil: true,
          rolodex: true,
        },
        learning_activities: {
          watch: true,
        },
        keywords: 'I love paris in the springtime!',
      });
    });
    it(`setting relevant keys will result in a router push`, () => {
      const { searchTerms, router } = prep();
      set(searchTerms, {
        keywords: 'test',
        categories: {
          cat1: true,
          cat2: true,
        },
      });
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {
          keywords: 'test',
          categories: 'cat1,cat2',
        },
      });
    });
    it(`removing keys will be propagated to the router`, () => {
      const { searchTerms, router } = prep({
        keywords: 'test',
        categories: 'cat1,cat2',
        grade_levels: 'level1',
      });
      set(searchTerms, {
        keywords: '',
        categories: {
          cat2: true,
        },
      });
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {
          categories: 'cat2',
        },
      });
    });
    it(`setting keywords to null will be propagated to the router`, () => {
      const { searchTerms, router } = prep({
        keywords: 'test',
        categories: 'cat1,cat2',
        grade_levels: 'level1',
      });
      set(searchTerms, {
        keywords: null,
        categories: {
          cat2: true,
        },
      });
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {
          categories: 'cat2',
        },
      });
    });
  });
  describe('displayingSearchResults computed property', () => {
    const searchKeys = [
      'learning_activities',
      'categories',
      'learner_needs',
      'accessibility_labels',
      'languages',
      'grade_levels',
    ];
    it.each(searchKeys)('should be true when there are any values for %s', key => {
      const { displayingSearchResults } = prep({
        [key]: 'test1,test2',
      });
      expect(get(displayingSearchResults)).toBe(true);
    });
    it('should be true when there is a value for keywords', () => {
      const { displayingSearchResults } = prep({
        keywords: 'testing testing one two three',
      });
      expect(get(displayingSearchResults)).toBe(true);
    });
  });
  describe('search method', () => {
    it('should call ContentNodeResource.fetchCollection when searchTerms changes', async () => {
      const { store } = prep();
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      store.commit('SET_QUERY', { categories: 'test1,test2' });
      await nextTick();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          categories: ['test1', 'test2'],
          max_results: 25,
          include_coach_content: false,
        },
      });
    });
    it('should not call ContentNodeResource.fetchCollection if there is no search', () => {
      const { search } = prep();
      ContentNodeResource.fetchCollection.mockClear();
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).not.toHaveBeenCalled();
    });
    it('should clear labels and more if there is no search', () => {
      const { search, labels, more } = prep();
      set(labels, ['test']);
      set(more, { test: 'test' });
      search();
      expect(get(labels)).toBeNull();
      expect(get(more)).toBeNull();
    });
    it('should call ContentNodeResource.fetchCollection if there is no search but a descendant is set', () => {
      const { search } = prep({}, ref({ tree_id: 1, lft: 10, rght: 20 }));
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          tree_id: 1,
          lft__gt: 10,
          rght__lt: 20,
          max_results: 1,
          include_coach_content: false,
        },
      });
    });
    it('should set labels and clear more if there is no search but a descendant is set', async () => {
      const { labels, more, search } = prep({}, ref({ tree_id: 1, lft: 10, rght: 20 }));
      const labelsSet = {
        available: ['labels'],
        languages: [],
      };
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({ labels: labelsSet }));
      set(more, { test: 'test' });
      search();
      await nextTick();
      expect(get(more)).toBeNull();
      expect(get(labels)).toEqual(labelsSet);
    });
    it('should call ContentNodeResource.fetchCollection when searchTerms exist', () => {
      const { search } = prep({ categories: 'test1,test2' });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          categories: ['test1', 'test2'],
          max_results: 25,
          include_coach_content: false,
        },
      });
    });
    it('should ignore other categories when AllCategories is set and search for isnull false', () => {
      const { search } = prep({ categories: `test1,test2,${NoCategories},${AllCategories}` });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { categories__isnull: false, max_results: 25, include_coach_content: false },
      });
    });
    it('should ignore other categories when NoCategories is set and search for isnull true', () => {
      const { search } = prep({ categories: `test1,test2,${NoCategories}` });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { categories__isnull: true, max_results: 25, include_coach_content: false },
      });
    });
    it('should set keywords when defined', () => {
      const { search } = prep({ keywords: `this is just a test` });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          keywords: `this is just a test`,
          max_results: 25,
          include_coach_content: false,
        },
      });
    });
    it('should set results, labels, and more with returned data', async () => {
      const { labels, more, results, search } = prep({ categories: 'test1,test2' });
      const expectedLabels = {
        available: ['labels'],
        languages: [],
      };
      const expectedMore = {
        cursor: 'adalskdjsadlkjsadlkjsalkd',
      };
      const expectedResults = [{ id: 'node-id1' }];
      ContentNodeResource.fetchCollection.mockReturnValue(
        Promise.resolve({
          labels: expectedLabels,
          results: expectedResults,
          more: expectedMore,
        }),
      );
      search();
      await nextTick();
      expect(get(labels)).toEqual(expectedLabels);
      expect(get(results)).toEqual(expectedResults);
      expect(get(more)).toEqual(expectedMore);
    });
  });
  describe('searchMore method', () => {
    it('should not call anything when not displaying search terms', () => {
      const { searchMore } = prep();
      ContentNodeResource.fetchCollection.mockClear();
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      searchMore();
      expect(ContentNodeResource.fetchCollection).not.toHaveBeenCalled();
    });
    it('should not call anything when more is null', () => {
      const { more, searchMore } = prep({ categories: 'test1' });
      ContentNodeResource.fetchCollection.mockClear();
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      set(more, null);
      searchMore();
      expect(ContentNodeResource.fetchCollection).not.toHaveBeenCalled();
    });
    it('should not call anything when moreLoading is true', () => {
      const { more, moreLoading, searchMore } = prep({ categories: 'test1' });
      ContentNodeResource.fetchCollection.mockClear();
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      set(more, {});
      set(moreLoading, true);
      searchMore();
      expect(ContentNodeResource.fetchCollection).not.toHaveBeenCalled();
    });
    it('should pass the more object directly to getParams', () => {
      const { more, searchMore } = prep({ categories: `test1,test2,${NoCategories}` });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      const moreExpected = { test: 'this', not: 'that' };
      set(more, moreExpected);
      searchMore();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({ getParams: moreExpected });
    });
    it('should set results, more and labels', async () => {
      const { labels, more, results, searchMore, search } = prep({
        categories: `test1,test2,${NoCategories}`,
      });
      const expectedLabels = {
        available: ['labels'],
        languages: [],
      };
      const expectedMore = {
        cursor: 'adalskdjsadlkjsadlkjsalkd',
      };
      const originalResults = [{ id: 'originalId', content_id: 'first' }];
      ContentNodeResource.fetchCollection.mockReturnValue(
        Promise.resolve({
          labels: expectedLabels,
          results: originalResults,
          more: expectedMore,
        }),
      );
      search();
      await nextTick();
      const expectedResults = [{ id: 'node-id1', content_id: 'second' }];
      ContentNodeResource.fetchCollection.mockReturnValue(
        Promise.resolve({
          labels: expectedLabels,
          results: expectedResults,
          more: expectedMore,
        }),
      );
      set(more, {});
      searchMore();
      await nextTick();
      expect(get(labels)).toEqual(expectedLabels);
      expect(get(results)).toEqual(originalResults.concat(expectedResults));
      expect(get(more)).toEqual(expectedMore);
    });
  });
  describe('removeFilterTag method', () => {
    it('should remove a filter from the searchTerms', () => {
      const { removeFilterTag, router } = prep({
        categories: 'test1,test2',
      });
      removeFilterTag({ value: 'test1', key: 'categories' });
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {
          categories: 'test2',
        },
      });
    });
    it('should remove keywords from the searchTerms', () => {
      const { removeFilterTag, router } = prep({
        keywords: 'test',
      });
      removeFilterTag({ value: 'test', key: 'keywords' });
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {},
      });
    });
    it('should not remove any other filters', () => {
      const { removeFilterTag, router } = prep({
        categories: 'test1,test2',
        learning_activities: 'watch',
      });
      removeFilterTag({ value: 'test1', key: 'categories' });
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {
          categories: 'test2',
          learning_activities: 'watch',
        },
      });
    });
  });
  describe('clearSearch method', () => {
    it('should remove all filters from the searchTerms', () => {
      const { clearSearch, router } = prep({
        categories: 'test1,test2',
        learning_activities: 'watch',
        keywords: 'this',
      });
      clearSearch();
      expect(router.push).toHaveBeenCalledWith({
        name,
        query: {},
      });
    });
  });
});
