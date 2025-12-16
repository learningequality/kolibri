import Vue, { nextTick } from 'vue';
import useFetch from '../useFetch';

const _eventDispatcher = new Vue();
let _fetchCount = 0;

/**
 * Helper method that will return a fetch method that we can control when it resolves.
 * This is useful to simulate fetch methods that can resolve in different times. Or fetch
 * operations that can resolve after others that have been initiated before.
 *
 * Example:
 * const { fetchMethod, resolveFetch } = getSincronizableFetch();
 *
 * // This will not resolve until resolveFetch('fetch1') is called
 * // once resolveFetch('fetch1') is called, the fetchMethod will return 'response1'
 * fetchData({ id: 'fetch1', response: 'response1' }).then(response => {
 *   console.log(response); // 'response1'
 * });
 *
 * ...
 * resolveFetch('fetch1');
 */
const getSincronizableFetch = () => {
  _fetchCount += 1;
  const fetchMethod = async ({ id, response, error }) => {
    await new Promise(resolve => {
      // concatenate a _fetchCount to avoid collisions between test cases
      _eventDispatcher.$on(`${_fetchCount}_${id}`, () => {
        resolve();
      });
    });
    if (error) {
      throw error;
    }
    return response;
  };

  const resolveFetch = id => {
    _eventDispatcher.$emit(`${_fetchCount}_${id}`);
  };

  return { fetchMethod, resolveFetch };
};

describe('useFetch', () => {
  describe('main fetch', () => {
    it('should initialize with default values if fetchMethod havent been called yet', () => {
      const { fetchMethod } = getSincronizableFetch();

      const { data, error, loading, count, hasMore, loadingMore } = useFetch({
        fetchMethod,
      });

      expect(data.value).toBe(null);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
      expect(count.value).toBe(null);
      expect(hasMore.value).toBe(false);
      expect(loadingMore.value).toBe(false);
    });

    it('should call fetchMethod when fetchData is called', async () => {
      const fetchMethod = jest.fn();
      const { fetchData } = useFetch({
        fetchMethod,
      });

      fetchData({ id: 'fetch1', response: 'response1' });
      expect(fetchMethod).toHaveBeenCalled();
    });

    it('should set loading to true when fetchMethod is called', async () => {
      const { fetchMethod } = getSincronizableFetch();

      const { loading, fetchData } = useFetch({
        fetchMethod,
      });

      fetchData({ id: 'fetch1', response: 'response1' });
      expect(loading.value).toBe(true);
    });

    it('should set loading to false when fetchMethod is resolved', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();

      const { loading, fetchData } = useFetch({
        fetchMethod,
      });

      fetchData({ id: 'fetch1', response: 'response1' });
      expect(loading.value).toBe(true);
      resolveFetch('fetch1');
      await nextTick();
      expect(loading.value).toBe(false);
    });

    it('should set data to the response of fetchMethod if no fetchMoreMethod has been passed', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();

      const { data, fetchData } = useFetch({
        fetchMethod,
      });

      const response = 'response1';
      fetchData({ id: 'fetch1', response: response });
      resolveFetch('fetch1');
      await nextTick();
      expect(data.value).toBe(response);
    });

    it('should set error to the response of fetchMethod if fetchMethod fails', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const { error, data, fetchData } = useFetch({
        fetchMethod,
      });

      const errorMessage = 'error1';
      fetchData({ id: 'fetch1', error: errorMessage });

      resolveFetch('fetch1');

      await nextTick();
      expect(error.value).toBe(errorMessage);
      expect(data.value).toBe(null);
    });

    it('should reset error when fetchMethod is called again', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const { error, fetchData } = useFetch({
        fetchMethod,
      });

      const errorMessage = 'error1';
      fetchData({ id: 'fetch1', error: errorMessage });
      resolveFetch('fetch1');
      await nextTick();
      expect(error.value).toBe(errorMessage);

      fetchData({ id: 'fetch2', response: 'response2' });
      await nextTick();
      expect(error.value).toBe(null);
    });

    describe('concurrent fetches, accept the last one, and ignore previous', () => {
      it('loading is not set to false if previous fetches has resolved', async () => {
        const { fetchMethod, resolveFetch } = getSincronizableFetch();

        const { loading, fetchData } = useFetch({
          fetchMethod,
        });

        fetchData({ id: 'fetch1', response: 'response1' });
        fetchData({ id: 'fetch2', response: 'response2' });
        expect(loading.value).toBe(true);

        resolveFetch('fetch1');
        await nextTick();
        // fetch1 should be ignored
        expect(loading.value).toBe(true);
      });

      it('loading is set to false if the last fetch has resolved, even if previous fetches has not resolved', async () => {
        const { fetchMethod, resolveFetch } = getSincronizableFetch();

        const { loading, fetchData } = useFetch({
          fetchMethod,
        });

        fetchData({ id: 'fetch1', response: 'response1' });
        fetchData({ id: 'fetch2', response: 'response2' });

        expect(loading.value).toBe(true);

        resolveFetch('fetch2');
        await nextTick();

        // Should not wait for fetch1 to resolve
        expect(loading.value).toBe(false);
      });

      it('data is set to the response of the last fetch, even if previous resolves after', async () => {
        const { fetchMethod, resolveFetch } = getSincronizableFetch();

        const { data, fetchData } = useFetch({
          fetchMethod,
        });

        fetchData({ id: 'fetch1', response: 'response1' });
        fetchData({ id: 'fetch2', response: 'response2' });

        resolveFetch('fetch2');
        resolveFetch('fetch1'); // first fetch resolves after, but should not override data

        await nextTick();
        expect(data.value).toBe('response2');
      });

      it('error should not override the response of the last fetch', async () => {
        const { fetchMethod, resolveFetch } = getSincronizableFetch();

        const { error, fetchData } = useFetch({
          fetchMethod,
        });

        fetchData({ id: 'fetch1', error: 'error1' });
        fetchData({ id: 'fetch2', response: 'response2' });

        resolveFetch('fetch2');
        resolveFetch('fetch1'); // first fetch resolves after, but should not set error

        await nextTick();
        expect(error.value).toBe(null);
      });
    });
  });
  describe('fetchMore', () => {
    it('data should be set to response.results of fetchData if fetchMoreMethod is passed', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { data, fetchData } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      const response = { results: [], more: null };
      fetchData({ id: 'fetch1', response: response });
      resolveFetch('fetch1');
      await nextTick();
      expect(data.value).toBe(response.results);
    });

    it('should set hasMore to false if response.more is not defined', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { hasMore, fetchData } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      const response = { results: [], more: undefined };
      fetchData({ id: 'fetch1', response: response });
      resolveFetch('fetch1');
      await nextTick();
      expect(hasMore.value).toBe(false);
    });

    it('should set hasMore to true if response.more is defined', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { hasMore, fetchData } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      const response = { results: [], more: { page: 2, limit: 10 } };
      fetchData({ id: 'fetch1', response: response });
      resolveFetch('fetch1');
      await nextTick();
      expect(hasMore.value).toBe(true);
    });

    it('should set count to response.count if response.count is defined', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { count, fetchData } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      const response = { results: [], count: 10 };
      fetchData({ id: 'fetch1', response: response });
      resolveFetch('fetch1');
      await nextTick();
      expect(count.value).toBe(response.count);
    });

    it('should not call fetchMoreMethod if fetchMore is called but fetchData hasnt been called yet', async () => {
      const { fetchMethod } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      fetchMore();
      expect(fetchMoreMethod).not.toHaveBeenCalled();
    });

    it('should not call fetchMoreMethod if the main fetchData is loading', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      fetchData({ id: 'fetch1', response: { results: [], more: { page: 2 } } });

      resolveFetch('fetch1');

      fetchData({ id: 'fetch2', response: { results: [], more: { page: 2 } } });

      await nextTick();

      fetchMore();

      expect(fetchMoreMethod).not.toHaveBeenCalled();
    });

    it('should not call fetchMoreMethod if fetchMore is called and hasMore is false', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      fetchData({ id: 'fetch1', response: { results: [], more: null } });

      resolveFetch('fetch1');

      await nextTick();
      fetchMore();

      expect(fetchMoreMethod).not.toHaveBeenCalled();
    });

    it('should call fetchMoreMethod if fetchMore is called and hasMore is true', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      fetchData({ id: 'fetch1', response: { results: [], more: { page: 2, limit: 10 } } });

      resolveFetch('fetch1');

      await nextTick();
      fetchMore();

      expect(fetchMoreMethod).toHaveBeenCalled();
    });

    it('should pass moreParams as the first argument to fetchMoreMethod', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const fetchMoreMethod = jest.fn();

      const { fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod,
      });

      const moreParams = { page: 2, limit: 10 };
      fetchData({ id: 'fetch1', response: { results: [], more: moreParams } });

      resolveFetch('fetch1');

      await nextTick();
      fetchMore();

      expect(fetchMoreMethod).toHaveBeenCalledWith(moreParams);
    });

    it('should set loadingMore to true when fetchMoreMethod is called', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();

      const { loadingMore, fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod: (more, ...args) => fetchMethod(...args),
      });

      fetchData({ id: 'fetch1', response: { results: [], more: { page: 2, limit: 10 } } });

      resolveFetch('fetch1');

      await nextTick();
      fetchMore();

      expect(loadingMore.value).toBe(true);
    });

    it('should set loadingMore to false when fetchMoreMethod is resolved', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();

      const { loadingMore, fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod: (more, ...args) => fetchMethod(...args),
      });

      fetchData({ id: 'fetch1', response: { results: [], more: { page: 2, limit: 10 } } });

      resolveFetch('fetch1');

      await nextTick();
      fetchMore({ id: 'fetch2', response: { results: [], more: { page: 3, limit: 10 } } });

      resolveFetch('fetch2');

      await nextTick();
      expect(loadingMore.value).toBe(false);
    });

    it('should concat the response of fetchMoreMethod to the data', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();

      const { data, fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod: (more, ...args) => fetchMethod(...args),
      });

      fetchData({ id: 'fetch1', response: { results: [1, 2, 3], more: { page: 2, limit: 10 } } });

      resolveFetch('fetch1');

      await nextTick();
      fetchMore({ id: 'fetch2', response: { results: [4, 5, 6], more: { page: 3, limit: 10 } } });

      resolveFetch('fetch2');

      await nextTick();
      expect(data.value).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should set error to the response of fetchMoreMethod if fetchMoreMethod fails', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const { error, fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod: (more, ...args) => fetchMethod(...args),
      });

      fetchData({ id: 'fetch1', response: { results: [1, 2, 3], more: { page: 2, limit: 10 } } });

      resolveFetch('fetch1');

      await nextTick();
      const errorMessage = 'error1';
      fetchMore({ id: 'fetch2', error: errorMessage });

      resolveFetch('fetch2');

      await nextTick();
      expect(error.value).toBe(errorMessage);
    });

    it('should reset error when fetchMoreMethod is called again', async () => {
      const { fetchMethod, resolveFetch } = getSincronizableFetch();
      const { error, fetchData, fetchMore } = useFetch({
        fetchMethod,
        fetchMoreMethod: (more, ...args) => fetchMethod(...args),
      });

      fetchData({ id: 'fetch1', response: { results: [1, 2, 3], more: { page: 2, limit: 10 } } });

      resolveFetch('fetch1');

      await nextTick();
      const errorMessage = 'error1';
      fetchMore({ id: 'fetch2', error: errorMessage });

      resolveFetch('fetch2');

      await nextTick();
      expect(error.value).toBe(errorMessage);

      fetchMore({ id: 'fetch3', response: { results: [4, 5, 6], more: { page: 3, limit: 10 } } });

      resolveFetch('fetch3');

      await nextTick();
      expect(error.value).toBe(null);
    });

    describe('concurrent fetches and more fetches', () => {
      it('should not call fetchMoreMethod again if fetchMore is already loading data', async () => {
        const { fetchMethod, resolveFetch } = getSincronizableFetch();
        const fetchMoreMethodFn = jest.fn();

        const { fetchData, fetchMore } = useFetch({
          fetchMethod,
          fetchMoreMethod: (more, ...args) => {
            fetchMoreMethodFn();
            return fetchMethod(...args);
          },
        });

        fetchData({ id: 'fetch1', response: { results: [1, 2, 3], more: { page: 2, limit: 10 } } });

        resolveFetch('fetch1');

        await nextTick();
        fetchMore({ id: 'fetch2', response: { results: [4, 5, 6], more: { page: 3, limit: 10 } } });

        fetchMore({ id: 'fetch2', response: { results: [7, 8, 9], more: { page: 4, limit: 10 } } });

        expect(fetchMoreMethodFn).toHaveBeenCalledTimes(1);
      });

      it('should not append the response of fetchMoreMethod if a different fetchData has been resolved', async () => {
        const { fetchMethod, resolveFetch } = getSincronizableFetch();

        const { data, fetchData, fetchMore } = useFetch({
          fetchMethod,
          fetchMoreMethod: (more, ...args) => fetchMethod(...args),
        });

        fetchData({ id: 'fetch1', response: { results: [1, 2, 3], more: { page: 2, limit: 10 } } });

        resolveFetch('fetch1');

        await nextTick();
        fetchMore({ id: 'fetch2', response: { results: [4, 5, 6], more: { page: 3, limit: 10 } } });

        const secondFetchResponse = { results: [7, 8, 9], more: { page: 4, limit: 10 } };
        fetchData({ id: 'fetch3', response: secondFetchResponse });

        resolveFetch('fetch3');
        await nextTick();

        resolveFetch('fetch2');
        await nextTick();

        // Should not concatenate the response of fetch2 even if it resolves after fetch3
        expect(data.value).toEqual(secondFetchResponse.results);
      });
    });
  });
});
