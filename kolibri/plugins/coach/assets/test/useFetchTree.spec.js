import useFetchTree from '../src/composables/useFetchTree.js';

describe('useFetchTree', () => {
  describe('fetching data with ContentNode.fetchTree', async () => {
    it('saves locally the topic', async () => {});

    it('saves the children of the topic', async () => {});

    it('saves the `more` .children.more property when present', async () => {});

    it('exposes a computed property to determine if there is more to fetch', async () => {});
  });

  describe('fetching more data', async () => {
    it('rejects the promise if there is nothing more to fetch', async () => {});

    it('fetches the next page of data, resulting in the results being appended to the existing results', async () => {});
  });

  describe('API', () => {
    it.each(['topic', 'resources', 'loading', 'fetchTree', 'fetchMore', 'hasMore'])(
      'exposes a %s property' /* property => {} */
    );

    it.each(Object.keys(useFetchTree({})))(
      'exposes no properties prefixed with _' /* property => {} */
    );
  });
});
