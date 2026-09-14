import flushPromises from 'flush-promises';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { shallowMount } from '@vue/test-utils';
import BookmarkPage from '../BookmarkPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('../../composables/useContentNodeProgress');
jest.mock('../../composables/useContentLink');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/apiResources/ContentNodeResource');

describe('Bookmark Page', () => {
  let wrapper;

  const fakeBookmarks = [{ bookmark: { id: 1 } }, { bookmark: { id: 2 } }, { bookmark: { id: 3 } }];

  beforeEach(async () => {
    urls.__echoUrls();
    ContentNodeResource.fetchBookmarks_v2.mockResolvedValue({
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
      await wrapper.vm.removeFromBookmarks({ id: '1' });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/kolibri:core:bookmarks_detail/1',
        }),
      );
    });
  });

  describe('When there are more bookmarks than in the default display', () => {
    it('displays a load more button', () => {
      expect(wrapper.find("[data-testid='load-more-button']")).toBeTruthy();
    });
    it('clicking the load more button calls the load more function', async () => {
      const mockFetchBookmarks = ContentNodeResource.fetchBookmarks_v2.mockResolvedValue({
        results: fakeBookmarks,
      });
      await wrapper.find("[data-testid='load-more-button']").vm.$emit('click');
      expect(mockFetchBookmarks).toHaveBeenCalledWith({
        params: { available: true, limit: 25 },
      });
    });
  });
});
