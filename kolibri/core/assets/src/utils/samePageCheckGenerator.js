/**
 * Action inhibition check
 *
 * This generator function produces checks that help determine whether the
 * asynchronous outcomes should still be run based on whether the user is
 * still on the same page as when the action was first triggered.
 */
export default function samePageCheckGenerator(store) {
  const pageId = store.getters.pageSessionId;
  return () => store.getters.pageSessionId === pageId;
}
