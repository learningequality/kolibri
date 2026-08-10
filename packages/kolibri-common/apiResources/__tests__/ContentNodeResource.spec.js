import client from 'kolibri/client';
import ContentNodeResource from '../ContentNodeResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('ContentNodeResource', () => {
  beforeEach(() => {
    ContentNodeResource.cache = {};
    client.__reset();
  });

  describe('retrieve', () => {
    it('serves a repeat request for the same node from the cache', async () => {
      client.__setPayload({ id: 'node-1', title: 'Node 1' });

      const first = await ContentNodeResource.retrieve('node-1');
      const second = await ContentNodeResource.retrieve('node-1');

      expect(first).toEqual(expect.objectContaining({ id: 'node-1', title: 'Node 1' }));
      expect(second).toEqual(expect.objectContaining({ id: 'node-1', title: 'Node 1' }));
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('returns a copy, so a caller mutating the result cannot corrupt the cache', async () => {
      client.__setPayload({ id: 'node-1', title: 'Node 1' });

      const fromRequest = await ContentNodeResource.retrieve('node-1');
      fromRequest.title = 'Mutated by the requester';
      const fromCache = await ContentNodeResource.retrieve('node-1');
      fromCache.title = 'Mutated by a later reader';

      const stillCached = await ContentNodeResource.retrieve('node-1');
      expect(stillCached.title).toEqual('Node 1');
    });
  });

  describe('list', () => {
    it('caches every node it returns, so retrieving one issues no further request', async () => {
      client.__setPayload([{ id: 'a' }, { id: 'b' }]);

      await ContentNodeResource.list({ parent: 'topic-1' });
      const node = await ContentNodeResource.retrieve('a');

      expect(node).toEqual(expect.objectContaining({ id: 'a' }));
      expect(client).toHaveBeenCalledTimes(1);
    });
  });
});
