import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { showSignInPage } from './modules/signIn/handlers';
import { showSignUpPage } from './modules/signUp/handlers';
import { ComponentMap } from './constants';
import AuthSelect from './views/AuthSelect';
import FacilitySelect from './views/FacilitySelect';
import ProfilePage from './views/ProfilePage';
import ProfileEditPage from './views/ProfileEditPage';
import SignInPage from './views/SignInPage';
import SignUpPage from './views/SignUpPage';
import NewPasswordPage from './views/SignInPage/NewPasswordPage';

router.beforeEach((to, from, next) => {
  const profileRoutes = [ComponentMap.PROFILE, ComponentMap.PROFILE_EDIT];
  // If logged in and not already going to a Profile page, redirect
  if (store.getters.isUserLoggedIn && !profileRoutes.includes(to.name)) {
    next(router.getRoute(ComponentMap.PROFILE));
  } else {
    next();
  }
});

export default [
  {
    path: '/',
    name: 'root',
    beforeEnter(to, from, next) {
      // Always redirect to Profile if logged in.
      if (store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.PROFILE));
      } else {
        // If Multiple Facilities but we've not stored a facilityId in localstorage
        // then we go to the AuthSelect route
        if (store.getters.facilities.length > 1 && !store.state.facilityId) {
          next(router.getRoute(ComponentMap.AUTH_SELECT));
        } else {
          next(router.getRoute(ComponentMap.SIGN_IN));
        }
      }
    },
  },
  {
    path: '/signin',
    component: SignInPage,
    beforeEnter(to, from, next) {
      if (store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.PROFILE));
      } else {
        // If we're on multiple facility device, show auth_select when
        // there is no facilityId
        if (store.getters.facilities.length > 1 && !store.state.facilityId) {
          // Go to FacilitySelect with whereToNext => SignUpPage
          const whereToNext = router.getRoute(ComponentMap.SIGN_IN);
          let query = {};
          if (to.query.next) {
            query = { next: to.query.next };
          }
          const route = {
            ...router.getRoute(ComponentMap.FACILITY_SELECT),
            params: { whereToNext },
            query,
          };
          next(route);
        } else {
          showSignInPage(store).then(() => {
            store.commit('CORE_SET_PAGE_LOADING', false);
            next();
          });
        }
      }
    },
  },
  {
    path: '/create_account',
    component: SignUpPage,
    beforeEnter(to, from, next) {
      if (store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.PROFILE));
        return Promise.resolve();
      } else {
        if (store.getters.facilities.length > 1 && !store.state.facilityId) {
          // Go to FacilitySelect with whereToNext => SignUpPage
          const whereToNext = router.getRoute(ComponentMap.SIGN_UP);
          const route = {
            ...router.getRoute(ComponentMap.FACILITY_SELECT),
            params: { whereToNext },
          };
          next(route);
        } else {
          showSignUpPage(store, from).then(() => {
            store.commit('CORE_SET_PAGE_LOADING', false);
            next();
          });
        }
      }
    },
  },
  {
    path: '/signin-or-signup',
    component: AuthSelect,
    beforeEnter(to, from, next) {
      // If we're loading CoreBase won't render.
      // There is nothing to load within this component.
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.PROFILE));
      } else {
        next();
      }
    },
  },
  {
    path: '/set-password',
    component: NewPasswordPage,
    beforeEnter(to, from, next) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (!to.query.facility || !to.query.username) {
        next({ path: '/' });
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
      // If we're loading CoreBase won't render.
      // There is nothing to load within this component.
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.PROFILE));
      } else {
        // This param is required, so return to AuthSelect
        // unless we have it
        if (to.params.whereToNext) {
          next();
        } else {
          next(router.getRoute(ComponentMap.AUTH_SELECT));
        }
      }
    },
  },
  {
    path: '/profile',
    component: ProfilePage,
    beforeEnter(to, from, next) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (!store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.SIGN_IN));
      } else {
        next();
      }
    },
  },
  {
    path: '/profile/edit',
    component: ProfileEditPage,
    beforeEnter(to, from, next) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (!store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.SIGN_IN));
      } else {
        next();
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
