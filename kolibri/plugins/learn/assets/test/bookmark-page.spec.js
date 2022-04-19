import client from 'kolibri.client';
import { ContentNodeResource } from 'kolibri.resources';
import { shallowMount } from '@vue/test-utils';
import BookmarkPage from '../src/views/BookmarkPage';

jest.mock('kolibri.client');
jest.mock('kolibri.urls');
jest.mock('kolibri.resources');

jest.mock('plugin_data', () => {
  return {
    __esModule: true,
    default: {
      channels: [],
    },
  };
});

describe('Bookmark Page', () => {
  let wrapper;
  let createdSpy;
  let removeFromBookmarksSpy;

  const fakeBookmarks = [{ id: 1 }, { id: 2 }, { id: 3 }];

  beforeEach(() => {
    createdSpy = jest.spyOn(BookmarkPage, 'created').mockImplementation(() => Promise.resolve());
    removeFromBookmarksSpy = jest.spyOn(BookmarkPage.methods, 'removeFromBookmarks');

    wrapper = shallowMount(BookmarkPage);
    wrapper.setData({
      loading: false,
      more: true,
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(BookmarkPage);
    expect(createdSpy).toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });
  describe('When the user clicks the remove from bookmarks icon', () => {
    it('will make a call to remove the bookmark from the list of bookmarks', async () => {
      const bookmarkId = '1';
      const index = 0;
      await removeFromBookmarksSpy(bookmarkId, index);
      expect(client).toHaveBeenCalledWith({
        method: 'delete',
        url: 'test',
      });
    });
  });

  describe('When there are more bookmarks than in the default display', () => {
    it('displays a load more button', () => {
      expect(wrapper.find("[data-test='load-more-button']")).toBeTruthy();
    });
    it('clicking the load more button calls the load more function', async () => {
      let mockFetchBookmarks = ContentNodeResource.fetchBookmarks.mockResolvedValue(fakeBookmarks);
      await wrapper.find("[data-test='load-more-button']").vm.$emit('click');
      expect(mockFetchBookmarks).toHaveBeenCalledWith({
        params: true,
      });
    });
  });
});
