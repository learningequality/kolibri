import client from 'kolibri/client';
import urls from 'kolibri/urls';
// eslint-disable-next-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser';
import { createBookmark, removeBookmark } from '../useBookmarks';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');

describe('useBookmarks', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
    useUser.mockImplementation(() => useUserMock({ currentUserId: 'user-1' }));
  });

  it('bookmarks a node for the current user, then deletes it by the bookmark id', async () => {
    client.__setPayload({ id: 'bookmark-1', contentnode_id: 'node-1' });

    await createBookmark('node-1');

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/kolibri:core:bookmarks_list',
        data: { contentnode_id: 'node-1', user: 'user-1' },
      }),
    );

    await removeBookmark('node-1');

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: '/kolibri:core:bookmarks_detail/bookmark-1',
      }),
    );
  });
});
