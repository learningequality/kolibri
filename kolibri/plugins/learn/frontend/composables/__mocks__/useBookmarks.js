/**
 * `useBookmarks` composable function mock.
 */

const MOCK_DEFAULTS = {
  fetchBookmarks: jest.fn(),
  bookmarksMap: {},
  loadingBookmarksMap: {},
  createBookmark: jest.fn(),
  removeBookmark: jest.fn(),
};

export function useBookmarksMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export const setBookmark = jest.fn();
export const clearBookmark = jest.fn();
export const createBookmark = jest.fn();
export const removeBookmark = jest.fn();

export default jest.fn(() => useBookmarksMock());
