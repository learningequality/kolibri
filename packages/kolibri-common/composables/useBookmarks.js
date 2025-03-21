import urls from 'kolibri/urls';
import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
import { inject, provide, ref } from 'vue';
import useUser from 'kolibri/composables/useUser';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import client from 'kolibri/client';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';

/**
 * @typedef {Object} Bookmark
 * @property {String} id - The id of the bookmark
 * @property {String} contentnode_id - The id of the contentnode that is bookmarked
 * @property {String} channel_id - The id of the user that bookmarked the contentnode
 * @property {String} content_id - The timestamp of when the bookmark was created
 */

/**
 * A ContentNode that has a Bookmark object attached to it.
 * @typedef {Object} BookmarkedContentNode
 * @mixes ContentNode - Ya know, the big ol' thing I'm not gonna copy here
 * @property {Bookmark} bookmark - The bookmark object for this contentnode
 */

/**
 * A module for adding and removing bookmarks.
 *
 * It fetches the bookmarks for the current user on initialization and
 * provide methods for adding and removing bookmarks.
 *
 * Initialize this at the top level of the relevant context (ie, where you'll need bookmarks)
 *
 * @param {Object} options
 * @param {Object} options.filters - Filters to pass to the fetch method's params object.
 * @param {Function} options.annotator - Function to annotate the results. The function should
 *  take and return a BookmarkedContentNode (aka a ContentNode w/ a Bookmark object at `.bookmark`.
 */
export default function useBookmarks({ filters = {}, annotator = null } = {}) {
  /**
   * @type BookmarkedContentNode[]
   */
  const bookmarks = ref([]);

  const { currentUserId } = useUser();
  const { sendPoliteMessage } = useKLiveRegion();
  const { coreString } = commonCoreStrings.methods;

  /**
   * @param {BookmarkedContentNode} node
   * @returns {String|null} - The id of the bookmark for the given contentnode,
   *                          or null if it doesn't exist
   */
  function _getBookmarkIdForContentNode(node) {
    const bookmarkedNode = bookmarks.value.find(bNode => bNode.id === node.id);
    if (bookmarkedNode) {
      return bookmarkedNode.bookmark.id;
    }
    return null;
  }

  /**
   * @param {BookmarkedContentNode} node
   */
  function isBookmarked(node) {
    return bookmarks.value.some(n => n.id === node.id);
  }

  /**
   * @param {BookmarkedContentNode} node
   */
  function addBookmark(node) {
    client({
      method: 'post',
      url: urls['kolibri:core:bookmarks_list'](),
      data: {
        contentnode_id: node.id,
        user: currentUserId.value,
      },
    }).then(response => {
      bookmarks.value.push({ bookmark: response.data, ...node });
      sendPoliteMessage(coreString('savedToBookmarks'));
    });
  }

  /**
   * @param {BookmarkedContentNode} node
   */
  function removeBookmark(node) {
    const bookmarkId = _getBookmarkIdForContentNode(node);
    if (!bookmarkId) {
      return;
    }
    client({
      method: 'delete',
      url: urls['kolibri:core:bookmarks_detail'](bookmarkId),
    }).then(() => {
      bookmarks.value = bookmarks.value.filter(n => n.id !== node.id);
      sendPoliteMessage(coreString('removedFromBookmarks'));
    });
  }

  /**
   * @param {BookmarkedContentNode} node
   */
  function toggleBookmark(node) {
    if (isBookmarked(node)) {
      removeBookmark(node);
    } else {
      addBookmark(node);
    }
  }

  /**
   * Fetches bookmarks for the current user.
   * @affects bookmarks
   */
  async function fetchBookmarks() {
    // Fetches contentnodes w/ their bookmark information.
    const response = await ContentNodeResource.fetchBookmarks({
      params: {
        available: true,
        force: true,
        ...filters,
      },
    });
    if (annotator) {
      const annotatedResults = await annotator(response);
      bookmarks.value = annotatedResults;
    } else {
      bookmarks.value = response;
    }
  }

  // Initialize
  fetchBookmarks();

  // Provide for injection
  provide('bookmarks', bookmarks);
  provide('isBookmarked', isBookmarked);
  provide('addBookmark', addBookmark);
  provide('removeBookmark', removeBookmark);
  provide('toggleBookmark', toggleBookmark);

  return {
    bookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
  };
}

export function injectUseBookmarks() {
  return {
    bookmarks: inject('bookmarks'),
    isBookmarked: inject('isBookmarked'),
    addBookmark: inject('addBookmark'),
    removeBookmark: inject('removeBookmark'),
    toggleBookmark: inject('toggleBookmark'),
  };
}
