import { get } from '@vueuse/core';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useFetchTree from '../src/composables/useFetchTree.js';
import {
  fetchTreeTopicResponseWithMore,
  fetchMoreTopicResponse,
  fetchTreeTopicWithoutMore,
} from './useFetchTree.fixtures.js';

// The properties that useFetchTree should expose, aka. the public API
const publicApi = ['topic', 'resources', 'loading', 'fetchTree', 'fetchMore', 'hasMore'];
var resources, topic, fetchTree, fetchMore, hasMore;

jest.mock('kolibri-common/apiResources/ContentNodeResource');

describe('useFetchTree', () => {
  describe('fetching data with ContentNode.fetchTree when there is more', () => {
    beforeAll(async () => {
      ContentNodeResource.fetchTree.mockResolvedValue(fetchTreeTopicResponseWithMore);
      ({ resources, topic, fetchTree, fetchMore, hasMore } = useFetchTree({
        topicId: '1',
      }));
      await fetchTree();
    });
    it('saves locally the topic', async () => {
      expect(get(topic)).toEqual(fetchTreeTopicResponseWithMore);
    });

    it('saves the children of the topic', async () => {
      expect(get(resources)).toEqual(fetchTreeTopicResponseWithMore.children.results);
    });

    it('exposes a computed property to determine if there is more to fetch', async () => {
      expect(get(hasMore)).toBeTruthy();
    });

    it('fetches the next page of data, resulting in the results being appended to the existing results', async () => {
      const resourcesBeforeFetchingMore = get(resources);
      // Need to update the mock to be sure it's retruning the correct data
      ContentNodeResource.fetchTree.mockResolvedValue(fetchMoreTopicResponse);
      await fetchMore();
      expect(get(resources)).toEqual([
        ...resourcesBeforeFetchingMore,
        ...fetchMoreTopicResponse.children.results,
      ]);
    });

    describe('fetching more data', () => {
      beforeAll(async () => {
        ContentNodeResource.fetchTree.mockResolvedValue(fetchTreeTopicWithoutMore);
        ({ resources, topic, fetchTree, fetchMore, hasMore } = useFetchTree({
          topicId: '1',
        }));
        await fetchTree();
      });
      it('saves locally the topic', async () => {
        expect(get(topic)).toEqual(fetchTreeTopicWithoutMore);
      });

      it('saves the children of the topic', async () => {
        expect(get(resources)).toEqual(fetchTreeTopicWithoutMore.children.results);
      });
      it('does not result in "having more"', async () => {
        expect(get(hasMore)).toBeFalsy();
      });
      it('rejects the promise if there is nothing more to fetch', async () => {
        expect(fetchMore()).rejects.toBeTruthy();
      });
    });
  });

  describe('API', () => {
    it.each(Object.keys(useFetchTree({ topicId: '1' })))('exposes a %s property', property => {
      expect(publicApi.includes(property));
    });

    it.each(Object.keys(useFetchTree({ topicId: '1' })))(
      'exposes no properties prefixed with _',
      property => {
        expect(property[0]).not.toBe('_');
      },
    );
  });
});
