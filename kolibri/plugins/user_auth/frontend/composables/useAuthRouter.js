import { computed } from 'vue';
import router from 'kolibri/router';
import { ComponentMap, SignInOptionToComponentMap } from '../constants';
import getUrlParameter from '../views/getUrlParameter';
import useAuthFlow from './useAuthFlow';

/**
 * @typedef {object} UseAuthRouterReturn
 * @property {import('vue').ComputedRef<object>} signInRoute - The route for the active sign-in
 * method.
 * @property {import('vue').ComputedRef<object>} defaultRoute - The route to use when none has been
 * specified.
 * @property {import('vue').ComputedRef<object>} pictureSignInRoute - The picture-password sign-in
 * route.
 * @property {import('vue').ComputedRef<object>} usernameSignInRoute - The username/password sign-in
 * route.
 * @property {import('vue').ComputedRef<object>} signUpRoute - The route to the new-account form.
 * @property {(signUpNext: boolean) => object} getFacilitySelectionRoute - Builds the
 * facility-selection route.
 */

const { facilityId, hasMultipleFacilities, signInMethod } = useAuthFlow();

/**
 * Translates the sign-in method to the component that is used for it
 * @type {import('vue').ComputedRef<string>}
 */
const signInRouteName = computed(() => {
  return SignInOptionToComponentMap[signInMethod.value];
});

/**
 * The default route (when no route has been specified), given:
 * - the current active/selected facility (previously chosen or the default)
 * - how many facilities there are
 * - whether picture password is enabled
 * @type {import('vue').ComputedRef<string>}
 */
const defaultRouteName = computed(() => {
  if (hasMultipleFacilities.value && !facilityId.value) {
    return ComponentMap.AUTH_SELECT;
  }
  return signInRouteName.value;
});

/**
 * Routing helpers for authentication flow, which requires a route to be injected in order to
 * allow this composable to be used outside of components and to extract the next step from
 * the route query.
 * @param {import('vue-router').Route} route - The component's route or a destination route.
 * @returns {UseAuthRouterReturn} The authentication routing helpers and computed routes.
 */
export default function useAuthRouter(route) {
  const _route = computed(() => route);

  /**
   * @type {import('vue').ComputedRef<string>}
   */
  const nextParam = computed(() => {
    // query is after hash
    if (_route.value?.query?.next) {
      return _route.value.query.next;
    }
    // query is before hash
    return getUrlParameter('next');
  });

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const nextQuery = computed(() => {
    return nextParam.value ? { next: nextParam.value } : {};
  });

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const homeRoute = computed(() => router.getRoute(ComponentMap.AUTH_SELECT, {}, nextQuery.value));

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const defaultRoute = computed(() => router.getRoute(defaultRouteName.value, {}, nextQuery.value));

  /**
   * Gets the facility selection route, with the next step route and carries over the next URI
   * @param {boolean} signUpNext - Whether facility selection should lead into the sign-up flow.
   * @returns {{name: string, params: {signUpNext: boolean}, query: object}} The facility-selection
   * route descriptor.
   */
  function getFacilitySelectionRoute(signUpNext) {
    return router.getRoute(ComponentMap.FACILITY_SELECT, { signUpNext }, nextQuery.value);
  }

  /**
   * Builds a sign-in route for the given component name, carrying over the next URI.
   * @param {string} name - The route/component name to navigate to.
   * @returns {{name: string, query: object}} The sign-in route descriptor.
   */
  function getSignInRoute(name) {
    return router.getRoute(name, {}, nextQuery.value);
  }

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const signInRoute = computed(() => getSignInRoute(signInRouteName.value));

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const pictureSignInRoute = computed(() => getSignInRoute(ComponentMap.PICTURE_SIGN_IN));

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const usernameSignInRoute = computed(() => getSignInRoute(ComponentMap.USERNAME_SIGN_IN));

  /**
   * @type {import('vue').ComputedRef<object>}
   */
  const signUpRoute = computed(() => getSignInRoute(ComponentMap.SIGN_UP));

  return {
    router,
    nextParam,
    nextQuery,
    homeRoute,
    defaultRoute,
    signInRoute,
    pictureSignInRoute,
    usernameSignInRoute,
    signUpRoute,
    getFacilitySelectionRoute,
    getSignInRoute,
  };
}
