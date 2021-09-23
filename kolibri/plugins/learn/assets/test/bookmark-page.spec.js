import { shallowMount } from '@vue/test-utils';
import BookmarkPage from '../src/views/BookmarkPage';

describe('Bookmark page', () => {
  let wrapper;
  let loadMoreSpy;
  let createdSpy;
  let removeFromBookmarksSpy;

  beforeAll(() => {
    loadMoreSpy = jest.spyOn(BookmarkPage.methods, 'loadMore');
    createdSpy = jest.spyOn(BookmarkPage, 'created').mockImplementation(() => Promise.resolve());
    removeFromBookmarksSpy = jest.spyOn(BookmarkPage.methods, 'removeFromBookmarks');

    wrapper = shallowMount(BookmarkPage, {
      stubs: {
        ContentCardGroupGrid: {
          name: 'ContentCardGroupGrid',
          template: '<div></div>',
        },
      },
    });
    wrapper.setData({
      loading: false,
      more: true,
      bookmarks: [{ a: 'b' }],
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(BookmarkPage);
    expect(createdSpy).toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });
  describe('When the user clicks the remove from bookmarks icon', () => {
    it('will make a call to remove the bookmark from the list of bookmarks', () => {
      wrapper.findComponent({ name: 'ContentCardGroupGrid' }).vm.$emit('removeFromBookmarks');
      expect(removeFromBookmarksSpy).toHaveBeenCalled();
    });
  });

  describe('When there are more bookmarks than in the default display', () => {
    it('displays a load more button', () => {
      expect(wrapper.find("[data-test='load-more-button']")).toBeTruthy();
    });
    it('clicking the load more button calls the load more function', () => {
      wrapper.find("[data-test='load-more-button']").vm.$emit('click');
      expect(loadMoreSpy).toHaveBeenCalled();
    });
  });
});
