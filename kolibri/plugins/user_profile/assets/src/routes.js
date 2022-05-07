import store from 'kolibri.coreVue.vuex.store';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import ProfilePage from './views/ProfilePage';
import ProfileEditPage from './views/ProfileEditPage';
import ChangeFacility from './views/ChangeFacility';

function preload(next) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.dispatch('getFacilityConfig').then(() => {
    store.commit('CORE_SET_PAGE_LOADING', false);
    next();
  });
}

export default [
  {
    path: '/',
    name: 'PROFILE',
    component: ProfilePage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
  },
  {
    path: '/edit',
    name: 'PROFILE_EDIT',
    component: ProfileEditPage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
  },

  {
    path: '/change_facility',
    name: 'SELECT_FACILITY',
    component: ChangeFacility,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
    children: [
      {
        path: 'change',
        name: 'CHANGE_FACILITY',
        component: ChangeFacility,
      },
      {
        path: 'confirm_account',
        name: 'CONFIRM_ACCOUNT',
        component: ChangeFacility,
      },
      {
        path: 'choose_admin',
        name: 'CHOOSE_ADMIN',
        component: ChangeFacility,
      },
      {
        path: 'confirm_merge',
        name: 'CONFIRM_MERGE',
        component: ChangeFacility,
      },
      {
        path: 'syncing_change_facility',
        name: 'SYNCING_CHANGE_FACILITY',
        component: ChangeFacility,
      },
      {
        path: 'create_account',
        name: 'CREATE_ACCOUNT',
        component: ChangeFacility,
      },
      {
        path: 'username_exists',
        name: 'USERNAME_EXISTS',
        component: ChangeFacility,
      },
      {
        path: 'require_account_credentials',
        name: 'REQUIRE_ACCOUNT_CREDENTIALS',
        component: ChangeFacility,
      },
      {
        path: 'admin_password',
        name: 'ADMIN_PASSWORD',
        component: ChangeFacility,
      },
      {
        path: 'show_accounts',
        name: 'SHOW_ACCOUNTS',
        component: ChangeFacility,
      },
      {
        path: 'show_accounts',
        name: 'CONFIRM_DETAILS',
        component: ChangeFacility,
      },
      {
        path: 'show_accounts',
        name: 'EDIT_DETAILS',
        component: ChangeFacility,
      },
      {
        path: 'merge_accounts',
        name: 'MERGE_ACCOUNTS',
        component: ChangeFacility,
      },
    ],
  },
  {
    path: '*',
    redirect: '/',
  },
];
