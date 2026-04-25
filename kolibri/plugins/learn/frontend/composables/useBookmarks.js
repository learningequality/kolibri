/**
 * A composable function containing logic related to learner's
 * bookmarks for resources.
 * All data exposed by this function belong to a current learner.
 */

import { reactive } from 'vue';
import { set } from '@vueuse/core';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import logger from 'kolibri-logging';
import useUser from 'kolibri/composables/useUser';
import BookmarksResource from 'kolibri-common/apiResources/BookmarksResource';

const logging = logger.getLogger(__filename);

// The reactive is defined in the outer scope so it can be used as a shared store
// Maps contentnode_id to the bookmark object
const bookmarksMap = reactive({});

// Maps contentnode_id to a boolean indicating if a bookmark action is in progress
const loadingBookmarksMap = reactive({});

/**
 * Adds or updates a bookmark in the shared bookmarksMap.
 * @param {object} bookmark - A bookmark object with at least `contentnode_id` and `id`.
 */
export function setBookmark(bookmark) {
  set(bookmarksMap, bookmark.contentnode_id, bookmark);
}

/**
 * Removes a bookmark from the shared bookmarksMap by contentnode_id.
 * @param {string} contentnodeId - The content node ID to remove from the map.
 */
export function clearBookmark(contentnodeId) {
  set(bookmarksMap, contentnodeId, undefined);
}

/**
 * Creates a bookmark on the server and updates the local bookmarksMap.
 * On failure, removes the entry from the map.
 * @param {string} contentnodeId - The content node ID to bookmark.
 * @returns {Promise} Promise that resolves with the created bookmark data.
 */
export async function createBookmark(contentnodeId) {
  const { currentUserId } = useUser();
  set(loadingBookmarksMap, contentnodeId, true);
  try {
    const response = await client({
      method: 'post',
      url: urls['kolibri:core:bookmarks_list'](),
      data: {
        contentnode_id: contentnodeId,
        user: currentUserId.value,
      },
    });
    setBookmark(response.data);
    return response.data;
  } catch (e) {
    clearBookmark(contentnodeId);
    throw e;
  } finally {
    set(loadingBookmarksMap, contentnodeId, false);
  }
}

/**
 * Removes a bookmark from the server and updates the local bookmarksMap.
 * On failure, restores the bookmark back into the map.
 * @param {string} contentnodeId - The content node ID whose bookmark to remove.
 * @returns {Promise} Promise that resolves when the bookmark is deleted.
 */
export async function removeBookmark(contentnodeId) {
  const savedBookmark = bookmarksMap[contentnodeId];
  if (!savedBookmark) {
    return;
  }
  set(loadingBookmarksMap, contentnodeId, true);
  try {
    await client({
      method: 'delete',
      url: urls['kolibri:core:bookmarks_detail'](savedBookmark.id),
    });
    clearBookmark(contentnodeId);
  } catch (e) {
    // Restore the bookmark if the delete failed
    setBookmark(savedBookmark);
    throw e;
  } finally {
    set(loadingBookmarksMap, contentnodeId, false);
  }
}

export default function useBookmarks() {
  /**
   * Fetches bookmarks data and saves data to this composable's store.
   * @param {object} getParams - Parameters to filter by (e.g. { contentnode_id }).
   * @returns {Promise} Promise that resolves with the fetched bookmarks array.
   * @public
   */
  async function fetchBookmarks(getParams) {
    const bookmarksData = await BookmarksResource.fetchCollection({
      getParams,
      force: true,
    });
    const bookmarks = bookmarksData ? bookmarksData : [];
    for (const bookmark of bookmarks) {
      setBookmark(bookmark);
    }
    return bookmarks;
  }

  // warn about potential reactiveness issues with using bookmarksMap inside computed properties
  logging.debug(
    'Note that bookmarksMap is a reactive object, and this may cause some reactiveness issues if used inside computed properties with Vue composition API. Defining computed properties that depends on bookmarksMap using options API should not cause any issues.',
  );

  return {
    fetchBookmarks,
    bookmarksMap,
    loadingBookmarksMap,
    createBookmark,
    removeBookmark,
  };
}
