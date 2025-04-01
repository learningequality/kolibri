import { v4 as uuidv4 } from 'uuid';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useBookmarks from '../useBookmarks';

jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri/urls');
jest.mock('kolibri/client');

function _createBookmark(contentnode_id) {
  return {
    id: uuidv4(),
    channel_id: uuidv4(),
    content_id: uuidv4(),
    contentnode_id,
  };
}

function _createBookmarkedContentNode() {
  const id = uuidv4();
  return {
    id,
    kind: 'video',
    bookmark: _createBookmark(id),
  };
}

function _fetchBookmarksResponse(numResults = 1) {
  return Array.from({ length: numResults }, _createBookmarkedContentNode);
}

describe('useBookmarks', () => {
  describe('initializing', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('user has no bookmarks', () => {
      const spy = jest
        .spyOn(ContentNodeResource, 'fetchBookmarks')
        .mockResolvedValue(_fetchBookmarksResponse(0));
      const { bookmarks } = useBookmarks();
      expect(bookmarks.value).toEqual([]);
      expect(spy).toHaveBeenCalled();
    });

    it('user has some bookmarks', async () => {
      const spy = jest
        .spyOn(ContentNodeResource, 'fetchBookmarks')
        .mockResolvedValue(_fetchBookmarksResponse(1));
      const { bookmarks } = useBookmarks();
      expect(spy).toHaveBeenCalled();
      await spy;
      expect(bookmarks.value.length).toBe(1);
    });
  });

  describe('managing bookmarks', () => {
    it('can add a bookmark', async () => {
      const bookmarkNode = _createBookmarkedContentNode();
      const { addBookmark, bookmarks } = useBookmarks();
      await addBookmark(bookmarkNode);
      expect(bookmarks.value.map(n => n.id)).toContain(bookmarkNode.id);
    });

    it('can remove a bookmark', async () => {
      const bookmarkNode = _createBookmarkedContentNode();
      const { addBookmark, removeBookmark, bookmarks } = useBookmarks();
      await addBookmark(bookmarkNode);
      expect(bookmarks.value.map(n => n.id)).toContain(bookmarkNode.id);
      await removeBookmark(bookmarkNode);
      expect(bookmarks.value.map(n => n.id)).not.toContain(bookmarkNode.id);
    });

    it('can toggle a bookmark', async () => {
      const bookmarkNode = _createBookmarkedContentNode();
      const { toggleBookmark, bookmarks } = useBookmarks();
      await toggleBookmark(bookmarkNode);
      expect(bookmarks.value.map(n => n.id)).toContain(bookmarkNode.id);
      await toggleBookmark(bookmarkNode);
      expect(bookmarks.value.map(n => n.id)).not.toContain(bookmarkNode.id);
      await toggleBookmark(bookmarkNode);
      expect(bookmarks.value.map(n => n.id)).toContain(bookmarkNode.id);
    });
  });
});
