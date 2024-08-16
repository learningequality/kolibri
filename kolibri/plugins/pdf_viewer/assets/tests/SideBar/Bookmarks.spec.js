import { mount } from '@vue/test-utils';
import Bookmarks from '../../src/views/SideBar/Bookmarks/index.vue';
import BookmarkItem from '../../src/views/SideBar/Bookmarks/BookmarkItem.vue';

function withWrapperArray(wrapperArray) {
  return {
    hasText: str => wrapperArray.filter(i => i.text().match(str)),
    not: {
      hasText: str => wrapperArray.filter(i => !i.text().match(str)),
    },
  };
}

const outline = [
  {
    dest: [{ num: 89, gen: 0 }, { name: 'XYZ' }, 70, 621, 0],
    url: null,
    title: 'Local Connection',
    items: [
      {
        dest: [{ num: 1, gen: 0 }, { name: 'XYZ' }, 70, 720, 0],
        url: null,
        title: 'Power source asdfasdf',
        items: [],
      },
      {
        dest: [{ num: 1, gen: 0 }, { name: 'XYZ' }, 70, 577, 0],
        url: null,
        title: 'Inner Local network connection',
        items: [],
      },
      {
        dest: [{ num: 1, gen: 0 }, { name: 'XYZ' }, 70, 450, 0],
        url: null,
        title: 'Server devices',
        items: [],
      },
      {
        dest: [{ num: 1, gen: 0 }, { name: 'XYZ' }, 70, 260, 0],
        url: null,
        title: 'Client devices',
        items: [],
      },
    ],
  },
  {
    dest: [{ num: 3, gen: 0 }, { name: 'XYZ' }, 70, 621, 0],
    url: null,
    title: 'Network Connection 2',
    items: [],
  },
];

function makeWrapper(options = {}) {
  return mount(Bookmarks, {
    ...options,
    mocks: { fetchContentNodeProgress: Promise.resolve() },
    propsData: {
      outline,
      goToDestination: jest.fn(),
      ...options.propsData,
    },
  });
}

describe('Pdf Bookmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should render the root bookmarks', () => {
    const wrapper = makeWrapper();
    expect(wrapper.findAllComponents(BookmarkItem)).toHaveLength(outline.length);
    outline.forEach(bookmark => {
      expect(
        withWrapperArray(wrapper.findAllComponents(BookmarkItem)).hasText(bookmark.title),
      ).toHaveLength(1);
    });
  });

  it('should render dropdown-icon for bookmarks with children', () => {
    const wrapper = makeWrapper();
    outline.forEach(bookmark => {
      const bookmarkItem = withWrapperArray(wrapper.findAllComponents(BookmarkItem))
        .hasText(bookmark.title)
        .at(0);
      if (bookmark.items.length) {
        expect(bookmarkItem.find('.dropdown-icon').exists()).toBe(true);
      } else {
        expect(bookmarkItem.find('.dropdown-icon').exists()).toBe(false);
      }
    });
  });

  it('should render children bookmarks when click on dropdown', async () => {
    const wrapper = makeWrapper();
    for (const bookmark of outline) {
      if (!bookmark.items.length) continue;
      const bookmarkItem = withWrapperArray(wrapper.findAllComponents(BookmarkItem))
        .hasText(bookmark.title)
        .at(0);

      // check that children are not rendered before click
      expect(
        withWrapperArray(bookmarkItem.findAllComponents(BookmarkItem)).hasText(
          bookmark.items[0].title,
        ),
      ).toHaveLength(0);

      bookmarkItem.find('.dropdown-icon-container').trigger('click');
      await wrapper.vm.$nextTick();
      expect(
        withWrapperArray(bookmarkItem.findAllComponents(BookmarkItem))
          .hasText(bookmark.items[0].title)
          // filter leaf nodes
          .filter(i => i.findAllComponents(BookmarkItem).length === 1),
      ).toHaveLength(1);
    }
  });

  it('should hide children bookmarks when double click on dropdown', async () => {
    const wrapper = makeWrapper();
    for (const bookmark of outline) {
      if (!bookmark.items.length) continue;
      const bookmarkItem = withWrapperArray(wrapper.findAllComponents(BookmarkItem))
        .hasText(bookmark.title)
        .at(0);

      bookmarkItem.find('.dropdown-icon-container').trigger('click');
      await wrapper.vm.$nextTick();
      bookmarkItem.find('.dropdown-icon-container').trigger('click');
      await wrapper.vm.$nextTick();

      expect(
        withWrapperArray(bookmarkItem.findAllComponents(BookmarkItem)).hasText(
          bookmark.items[0].title,
        ),
      ).toHaveLength(0);
    }
  });

  it('should call goToDestination when click on bookmark', async () => {
    const goToDestination = jest.fn();
    const wrapper = makeWrapper({
      propsData: { goToDestination },
    });
    for (const bookmark of outline) {
      const bookmarkItem = withWrapperArray(wrapper.findAllComponents(BookmarkItem))
        .hasText(bookmark.title)
        .at(0);
      bookmarkItem.find('.bookmark-item-title').trigger('click');
      await wrapper.vm.$nextTick();
      expect(goToDestination).toHaveBeenCalledWith(bookmark.dest);
    }
  });
});
