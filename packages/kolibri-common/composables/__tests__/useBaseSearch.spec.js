import { get, set } from '@vueuse/core';
import Vue, { nextTick, ref, defineComponent, h } from 'vue';
import { render } from '@testing-library/vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { ContentNodeKinds, LearningActivities } from 'kolibri/constants';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { useRoute, useRouter } from 'vue-router/composables'; // eslint-disable-line
import Modalities from 'kolibri-constants/Modalities';
import useBaseSearch, { injectBaseSearch } from '../useBaseSearch';

jest.mock('kolibri/composables/useUser');
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(),
  useRouter: jest.fn(),
}));

const name = 'not important';

function prep(query = {}, descendant = null, filters = null) {
  const mockRoute = Vue.observable({ query, name });
  const mockRouter = { push: jest.fn().mockReturnValue(Promise.resolve()) };
  useRoute.mockReturnValue(mockRoute);
  useRouter.mockReturnValue(mockRouter);
  return {
    ...useBaseSearch({ descendant, filters }),
    router: mockRouter,
    mockRoute,
  };
}

// injectBaseSearch's helpers are provide-only, so drive them from a child of
// a component that called useBaseSearch, with a router that updates the route.
function mountSearch() {
  const mockRoute = Vue.observable({ query: {}, name });
  const mockRouter = {
    push: jest.fn(next => {
      mockRoute.query = { ...next.query };
      return Promise.resolve();
    }),
  };
  useRoute.mockReturnValue(mockRoute);
  useRouter.mockReturnValue(mockRouter);
  let api = null;
  const Child = defineComponent({
    setup() {
      api = injectBaseSearch();
      return () => h('div');
    },
  });
  const Parent = defineComponent({
    setup() {
      useBaseSearch({});
      return () => h(Child);
    },
  });
  const utils = render(Parent);
  return { getApi: () => api, ...utils };
}

describe(`useBaseSearch`, () => {
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
  describe('course search params', () => {
    async function searchParams() {
      const { mockRoute } = prep();
      mockRoute.query = { categories: 'test1' };
      await nextTick();
      const call = ContentNodeResource.fetchCollection.mock.calls.find(
        ([{ getParams }]) => getParams.categories,
      );
      return call[0].getParams;
    }

    it('includes courses for a user with a role', async () => {
      useUser.mockImplementation(() => useUserMock({ hasRole: true }));
      const params = await searchParams();
      expect(params.exclude_modalities).toBeNull();
      expect(params.exclude_course_ancestry).toBe(false);
    });

    it('excludes courses on a learn-only device, even for a user with a role', async () => {
      useUser.mockImplementation(() => useUserMock({ hasRole: true, isLearnerOnlyImport: true }));
      const params = await searchParams();
      expect(params.exclude_modalities).toEqual(Modalities.COURSE);
      expect(params.exclude_course_ancestry).toBe(true);
      // Coach content is not gated on the device being a learn-only device.
      expect(params.include_coach_content).toBe(true);
    });
  });
  describe('search method', () => {
    it('should call ContentNodeResource.fetchCollection when searchTerms changes', async () => {
      const { mockRoute } = prep();
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      mockRoute.query = { categories: 'test1,test2' };
      await nextTick();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          categories: ['test1', 'test2'],
          max_results: 25,
          include_coach_content: false,
          exclude_modalities: Modalities.COURSE,
          exclude_course_ancestry: true,
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
          exclude_modalities: Modalities.COURSE,
          exclude_course_ancestry: true,
        },
      });
    });
    it('should call ContentNodeResource.fetchCollection if there is no search but a filter is set', () => {
      const { search } = prep({}, null, { kind: ContentNodeKinds.EXERCISE });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          kind: ContentNodeKinds.EXERCISE,
          max_results: 1,
          include_coach_content: false,
          exclude_modalities: Modalities.COURSE,
          exclude_course_ancestry: true,
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
          exclude_modalities: Modalities.COURSE,
          exclude_course_ancestry: true,
        },
      });
    });
    it('should set keywords when defined', () => {
      const { search } = prep({ keywords: `this is just a test` });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      search();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({
        getParams: {
          question: `this is just a test`,
          max_results: 25,
          include_coach_content: false,
          exclude_modalities: Modalities.COURSE,
          exclude_course_ancestry: true,
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
      const { more, searchMore } = prep({ categories: 'test1,test2,test3' });
      ContentNodeResource.fetchCollection.mockReturnValue(Promise.resolve({}));
      const moreExpected = { test: 'this', not: 'that' };
      set(more, moreExpected);
      searchMore();
      expect(ContentNodeResource.fetchCollection).toHaveBeenCalledWith({ getParams: moreExpected });
    });
    it('should set results, more and labels', async () => {
      const { labels, more, results, searchMore, search } = prep({
        categories: 'test1,test2,test3',
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

  describe('selectFilterCombination', () => {
    it('applies every filter and strips all matched words', async () => {
      ContentNodeResource.fetchCollection.mockReturnValue(
        Promise.resolve({ results: [], labels: {} }),
      );
      const api = mountSearch().getApi();
      api.setKeywords('watch math');
      await nextTick();
      ContentNodeResource.fetchCollection.mockClear();
      api.selectFilterCombination([
        {
          filterKey: 'learning_activities',
          filterValue: 'WATCHVAL',
          label: 'Watch',
          type: 'activity',
          key: 'WATCH',
        },
        { filterKey: 'categories', filterValue: 'MATHVAL', label: 'Mathematics', type: 'category' },
      ]);
      await nextTick();
      await nextTick();
      const calls = ContentNodeResource.fetchCollection.mock.calls.filter(
        c => c[0] && c[0].getParams && c[0].getParams.max_results === 25,
      );
      const params = calls[calls.length - 1][0].getParams;
      expect(params.learning_activities).toEqual(['WATCHVAL']);
      expect(params.categories).toEqual(['MATHVAL']);
      expect(params.question).toBeUndefined();
    });
  });

  describe('global labels', () => {
    const remoteBaseurl = 'https://remote.example.org/';

    // The device's baseurl resolves asynchronously, so the setup-time fetch of the
    // label catalog goes out before it is known and races the one the baseurl
    // watcher starts. Drive both by hand to pin down which response wins.
    function mountWithBaseurl(baseurl) {
      const mockRoute = Vue.observable({ query: {}, name });
      useRoute.mockReturnValue(mockRoute);
      useRouter.mockReturnValue({ push: jest.fn().mockReturnValue(Promise.resolve()) });
      let api = null;
      const Child = defineComponent({
        setup() {
          api = injectBaseSearch();
          return () => h('div');
        },
      });
      const Parent = defineComponent({
        setup() {
          useBaseSearch({ baseurl });
          return () => h(Child);
        },
      });
      const utils = render(Parent);
      return { getApi: () => api, ...utils };
    }

    async function flush() {
      await Promise.resolve();
      await Promise.resolve();
    }

    it('discards a label response for a baseurl that is no longer current', async () => {
      const resolvers = {};
      ContentNodeResource.fetchCollection = jest.fn(
        ({ getParams }) =>
          new Promise(resolve => {
            resolvers[getParams.baseurl || 'local'] = resolve;
          }),
      );
      const baseurl = ref(undefined);
      const { getApi } = mountWithBaseurl(baseurl);

      // Fetched at setup, before the device is known, so this is the local catalog.
      expect(Object.keys(resolvers)).toEqual(['local']);

      set(baseurl, remoteBaseurl);
      await nextTick();
      expect(Object.keys(resolvers)).toEqual(['local', remoteBaseurl]);

      // The device's labels arrive first...
      resolvers[remoteBaseurl]({ labels: { learning_activities: [LearningActivities.CREATE] } });
      await flush();
      // ...then the local ones land late and must not replace them.
      resolvers.local({ labels: { learning_activities: [LearningActivities.WATCH] } });
      await flush();

      expect(get(getApi().availableLearningActivities)).toEqual({
        CREATE: LearningActivities.CREATE,
      });
    });

    it("does not leave another device's labels on display when the fetch fails", async () => {
      let rejectRemote;
      ContentNodeResource.fetchCollection = jest.fn(({ getParams }) =>
        getParams.baseurl
          ? new Promise((resolve, reject) => {
              rejectRemote = reject;
            })
          : Promise.resolve({ labels: { learning_activities: [LearningActivities.WATCH] } }),
      );
      const baseurl = ref(undefined);
      const { getApi } = mountWithBaseurl(baseurl);
      await flush();
      expect(get(getApi().availableLearningActivities)).toEqual({
        WATCH: LearningActivities.WATCH,
      });

      set(baseurl, remoteBaseurl);
      await nextTick();
      rejectRemote(new Error('device unreachable'));
      await flush();

      expect(get(getApi().availableLearningActivities)).toEqual({});
    });
  });

  describe('keyword autocomplete', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('discards a slower, older autocomplete response that resolves after a newer one', async () => {
      const api = mountSearch().getApi();
      const resolvers = [];
      ContentNodeResource.fetchCollection.mockImplementation(
        () => new Promise(resolve => resolvers.push(resolve)),
      );

      api.keyWordAutoCompleteHandler('first query');
      jest.advanceTimersByTime(300);
      api.keyWordAutoCompleteHandler('second query');
      jest.advanceTimersByTime(300);
      expect(resolvers).toHaveLength(2);

      // Newer request resolves first...
      resolvers[1]({ results: [{ id: 'second-result' }] });
      await Promise.resolve();
      await Promise.resolve();
      // ...then the stale older request resolves late and must not clobber it.
      resolvers[0]({ results: [{ id: 'first-result' }] });
      await Promise.resolve();
      await Promise.resolve();

      expect(get(api.autoCompleteSuggestions).map(s => s.id)).toEqual(['second-result']);
    });

    it('cancels the pending debounced fetch on unmount', () => {
      const { getApi, unmount } = mountSearch();
      ContentNodeResource.fetchCollection.mockClear();
      getApi().keyWordAutoCompleteHandler('fraction');
      unmount();
      jest.advanceTimersByTime(300);
      expect(ContentNodeResource.fetchCollection).not.toHaveBeenCalled();
    });
  });
});
