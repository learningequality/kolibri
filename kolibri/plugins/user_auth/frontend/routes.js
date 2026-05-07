import { clearError } from 'kolibri/utils/appError';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { showInactivitySnackbar } from './utils';
import { ComponentMap } from './constants';
import AuthSelect from './views/AuthSelect';
import FacilitySelect from './views/FacilitySelect';
import SignInPage from './views/SignInPage';
import PictureSignInPage from './views/SignInPage/PictureSignInPage.vue';
import SignUpPage from './views/SignUpPage';
import NewPasswordPage from './views/SignInPage/NewPasswordPage';
import useAuthFlow from './composables/useAuthFlow';
import useAuthRouter from './composables/useAuthRouter';

const { facilityId, signInMethod, canSignUpWithFacility } = useAuthFlow();

async function signInHook(method, to, from, next) {
  const { getFacilitySelectionRoute } = useAuthRouter(to);

  // Persist the sign-in method according to the route
  if (signInMethod.value !== method) {
    signInMethod.value = method;
  }
  // If no facility has been selected, take user to facility selection
  if (!facilityId.value) {
    next(getFacilitySelectionRoute(false));
    return;
  }
  await showInactivitySnackbar();
  next();
}

export default [
  {
    path: '/',
    name: 'root',
    beforeEnter(to, from, next) {
      // Redirect to default route
      next(useAuthRouter(to).defaultRoute.value);
    },
  },
  {
    path: '/signin',
    component: SignInPage,
    async beforeEnter(to, from, next) {
      await signInHook(OptionsForSignIn.USERNAME_ONLY, to, from, next);
    },
  },
  {
    path: '/picture-signin',
    component: PictureSignInPage,
    async beforeEnter(to, from, next) {
      await signInHook(OptionsForSignIn.PICTURE_PASSWORD, to, from, next);
    },
  },
  {
    path: '/create_account',
    component: SignUpPage,
    async beforeEnter(to, from, next) {
      const { getFacilitySelectionRoute, defaultRoute } = useAuthRouter(to);
      // Clear error if arriving on Sign Up
      if (from.name !== ComponentMap.SIGN_UP) {
        clearError();
      }

      if (!facilityId.value) {
        next(getFacilitySelectionRoute(true));
        return;
      }

      if (!canSignUpWithFacility.value) {
        // Redirect to default route
        next(defaultRoute.value);
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
        next(useAuthRouter(to).defaultRoute.value);
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
      if (to.params.signUpNext !== undefined) {
        next();
      } else {
        next(useAuthRouter(to).homeRoute.value);
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
