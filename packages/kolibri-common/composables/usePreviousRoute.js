import { ref, provide, inject } from 'vue';
import { onBeforeRouteUpdate, useRouter } from 'vue-router/composables';

/**
 * Composable for providing a route tracking context to track the previous route. You can
 * then inject the `previousRoute` ref in any component that is a child of the provider using the
 * `injectPreviousRoute` function.
 *
 * This composable defines the `previousRoute` ref inside the `usePreviousRoute` composable function
 * itself and not globally, with the intention that this composable is scoped to a specific
 * component that has a router view (i.e. renders sub-routes).
 *
 * This is especially useful when you need to track previous routes just in the scope
 * of a specific sub-routes context, so you wont need to check if the previous route
 * was from a different hierarchy as it will just be null.
 * @returns {import('vue').Ref<?import('vue-router').Route>} Ref to the previously visited
 * route within this sub-route context, or null when no previous route is known.
 */
export default function usePreviousRoute() {
  const previousRoute = ref(null);

  onBeforeRouteUpdate((to, from, next) => {
    previousRoute.value = from;
    next();
  });

  provide('previousRoute', previousRoute);

  return previousRoute;
}

/**
 * Inject the previous route ref.
 * @returns {import('vue').Ref<?import('vue-router').Route>} Ref provided by the nearest
 * `usePreviousRoute` ancestor.
 */
export function injectPreviousRoute() {
  return inject('previousRoute');
}

/**
 * Returns a function to go back to the previous route popping the history stack if the
 * previous route belongs to the same sub-routes context. If not, it will navigate to a fallback
 * route defined by the `fallbackRoute` prop or the `getFallbackRoute` function.
 * @param {object} options - Fallback configuration.
 * @param {import('vue-router').RawLocation} [options.fallbackRoute] - Static route descriptor
 * to navigate to when no previous route is known.
 * @param {() => import('vue-router').RawLocation} [options.getFallbackRoute] - Function returning
 * a route descriptor to navigate to when no previous route is known.
 * @returns {() => void} Function that, when called, pops the previous route or navigates to
 * the configured fallback.
 */
export function useGoBack({ fallbackRoute, getFallbackRoute }) {
  const previousRoute = injectPreviousRoute();
  const router = useRouter();

  function goBack() {
    // Go back just if there is a previous route that belongs to the
    // same routes context.
    if (previousRoute.value) {
      return router.back();
    }

    if (fallbackRoute) {
      return router.push(fallbackRoute);
    }

    if (getFallbackRoute) {
      return router.push(getFallbackRoute());
    }

    // eslint-disable-next-line no-console
    console.warn('No fallback route provided to navigate back. No action taken.');
  }

  return goBack;
}
