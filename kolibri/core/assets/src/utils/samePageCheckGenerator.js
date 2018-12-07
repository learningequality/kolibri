/**
 * Action inhibition check
 *
 * This generator function produces checks that help determine whether the
 * asynchronous outcomes should still be run based on whether the user is
 * still on the same page as when the action was first triggered.
 */
export default function samePageCheckGenerator(store) {
  let pageId = store.getters.pageSessionId;
  if (!pageId) {
    pageId = store.rootGetters.pageSessionId;
    return () => store.rootGetters.pageSessionId === pageId;
  } else {
    return () => store.getters.pageSessionId === pageId;
  }
}
