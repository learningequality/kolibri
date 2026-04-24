import { ref, provide, inject } from 'vue';
import { onBeforeRouteUpdate, useRouter } from 'vue-router/composables';

export default function usePreviousRoute() {
  const previousRoute = ref(null);

  onBeforeRouteUpdate((to, from, next) => {
    previousRoute.value = from;
    next();
  });

  provide('previousRoute', previousRoute);

  return previousRoute;
}

export function injectPreviousRoute() {
  return inject('previousRoute');
}

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
