import router from 'kolibri/router';

/**
 * Action inhibition check.
 *
 * Returns a function that checks whether the user is still on the same
 * route as when this generator was called.  Use it to guard async
 * callbacks so stale results are discarded after navigation.
 *
 * @param {Object} [route] - The target route object.  Pass this when
 *   calling from inside a beforeEach guard (route handler), where
 *   router.currentRoute still points to the previous route.
 *   Omit when calling from a Vue component where the route is resolved.
 */
export default function samePageCheckGenerator(route) {
  const initialFullPath = route ? route.fullPath : router.currentRoute.fullPath;
  return () => router.currentRoute.fullPath === initialFullPath;
}
