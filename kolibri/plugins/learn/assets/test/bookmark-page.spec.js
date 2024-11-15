import flushPromises from 'flush-promises';
import client from 'kolibri/client';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { shallowMount } from '@vue/test-utils';
import BookmarkPage from '../src/views/BookmarkPage';
import makeStore from './makeStore';

jest.mock('../src/composables/useContentNodeProgress');
jest.mock('../src/composables/useContentLink');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/apiResources/ContentNodeResource');

describe('Bookmark Page', () => {
  let wrapper;

  const fakeBookmarks = [{ bookmark: { id: 1 } }, { bookmark: { id: 2 } }, { bookmark: { id: 3 } }];

  beforeEach(async () => {
    ContentNodeResource.fetchBookmarks.mockResolvedValue({
      results: fakeBookmarks,
      more: { available: true, limit: 25 },
    });
    wrapper = shallowMount(BookmarkPage, { store: makeStore() });
    await flushPromises();
  });

  it('smoke test', () => {
    const wrapper = shallowMount(BookmarkPage);
    expect(wrapper.exists()).toBe(true);
  });
  describe('When the user clicks the remove from bookmarks icon', () => {
    it('will make a call to remove the bookmark from the list of bookmarks', async () => {
      const bookmarkId = '1';
      const index = 0;
      await wrapper.vm.removeFromBookmarks(bookmarkId, index);
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
      const mockFetchBookmarks = ContentNodeResource.fetchBookmarks.mockResolvedValue({
        results: fakeBookmarks,
      });
      await wrapper.find("[data-test='load-more-button']").vm.$emit('click');
      expect(mockFetchBookmarks).toHaveBeenCalledWith({
        params: { available: true, limit: 25 },
      });
    });
  });
});
