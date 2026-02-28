import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import Bookmarks from '../SideBar/Bookmarks/index.vue';

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
  return render(Bookmarks, {
    ...options,
    mocks: { fetchContentNodeProgress: Promise.resolve() },
    props: {
      outline,
      goToDestination: jest.fn(),
      ...(options.propsData || options.props),
    },
  });
}

describe('Pdf Bookmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.container).toBeTruthy();
  });

  it('should render the root bookmarks', () => {
    makeWrapper();

    outline.forEach(bookmark => {
      expect(screen.getByText(bookmark.title)).toBeInTheDocument();
    });
  });

  it('should render dropdown-icon for bookmarks with children', () => {
    makeWrapper();
    outline.forEach(bookmark => {
      const titleEl = screen.getByText(bookmark.title);

      const bookmarkContainer = titleEl.closest('li');

      if (bookmark.items.length) {
        expect(bookmarkContainer.querySelector('.dropdown-icon')).toBeTruthy();
      } else {
        expect(bookmarkContainer.querySelector('.dropdown-icon')).toBeFalsy();
      }
    });
  });

  it('should render children bookmarks when click on dropdown', async () => {
    makeWrapper();
    for (const bookmark of outline) {
      if (!bookmark.items.length) continue;

      const titleEl = screen.getByText(bookmark.title);
      const dropdownBtn = titleEl.closest('li').querySelector('.dropdown-icon-container');

      expect(screen.queryByText(bookmark.items[0].title)).not.toBeInTheDocument();

      await fireEvent.click(dropdownBtn);

      expect(screen.getByText(bookmark.items[0].title)).toBeInTheDocument();
    }
  });

  it('should hide children bookmarks when double click on dropdown', async () => {
    makeWrapper();
    for (const bookmark of outline) {
      if (!bookmark.items.length) continue;

      const titleEl = screen.getByText(bookmark.title);
      const dropdownBtn = titleEl.closest('li').querySelector('.dropdown-icon-container');

      await fireEvent.click(dropdownBtn);

      await waitFor(() => {
        expect(screen.getByText(bookmark.items[0].title)).toBeInTheDocument();
      });

      await fireEvent.click(dropdownBtn);

      await waitFor(() => {
        expect(screen.queryByText(bookmark.items[0].title)).not.toBeInTheDocument();
      });
    }
  });

  it('should call goToDestination when click on bookmark', async () => {
    const goToDestination = jest.fn();
    makeWrapper({
      props: { goToDestination },
    });

    for (const bookmark of outline) {
      const titleEl = screen.getByText(bookmark.title);
      await fireEvent.click(titleEl);
      expect(goToDestination).toHaveBeenCalledWith(bookmark.dest);
    }
  });
});
