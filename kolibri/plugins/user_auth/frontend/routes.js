import router from 'kolibri/router';
import { clearError } from 'kolibri/utils/appError';
import { showInactivitySnackbar, getFacilitySelectionRoute } from './utils';
import { ComponentMap } from './constants';
import AuthSelect from './views/AuthSelect';
import FacilitySelect from './views/FacilitySelect';
import SignInPage from './views/SignInPage';
import SignUpPage from './views/SignUpPage';
import NewPasswordPage from './views/SignInPage/NewPasswordPage';
import useAuthFlow from './composables/useAuthFlow';

const { facilityId, defaultRoute, signInRoute, canSignUpWithFacility } = useAuthFlow();

export default [
  {
    path: '/',
    name: 'root',
    beforeEnter(to, from, next) {
      // Redirect to default route
      next(router.getRoute(defaultRoute.value));
    },
  },
  {
    path: '/signin',
    component: SignInPage,
    async beforeEnter(to, from, next) {
      // If no facility has been selected, take user to facility selection
      if (!facilityId.value) {
        // Go to FacilitySelect with whereToNext => SignUpPage
        next(
          getFacilitySelectionRoute(signInRoute.value, {
            query: to.query.next ? { next: to.query.next } : {},
          }),
        );
        return;
      }
      await showInactivitySnackbar();
      next();
    },
  },
  {
    path: '/create_account',
    component: SignUpPage,
    async beforeEnter(to, from, next) {
      // Clear error if arriving on Sign Up
      if (from.name !== ComponentMap.SIGN_UP) {
        clearError();
      }

      if (!facilityId.value) {
        // Go to FacilitySelect with whereToNext => SignUpPage
        next(getFacilitySelectionRoute(ComponentMap.SIGN_UP));
        return;
      }

      if (!canSignUpWithFacility.value) {
        // Redirect to default route
        next(router.getRoute(defaultRoute.value));
        return;
      }

      next();
    },
  },
  {
    path: '/signin-or-signup',
    component: AuthSelect,
    beforeEnter(to, from, next) {
      next();
    },
  },
  {
    path: '/set-password',
    component: NewPasswordPage,
    beforeEnter(to, from, next) {
      if (!to.query.facility || !to.query.username) {
        next(router.getRoute(defaultRoute.value));
      } else {
        next();
      }
    },
    props(route) {
      return {
        facilityId: route.query.facility,
        username: route.query.username,
      };
    },
  },
  {
    path: '/facilities',
    component: FacilitySelect,
    props: true,
    beforeEnter(to, from, next) {
      // This param is required, so return to AuthSelect
      // unless we have it
      if (to.params.whereToNext) {
        next();
      } else {
        next(router.getRoute(ComponentMap.AUTH_SELECT));
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
