import store from 'kolibri/store';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import ProfilePage from './views/ProfilePage';
import ProfileEditPage from './views/ProfileEditPage';
import ChangeFacility from './views/ChangeFacility';
import ConfirmMerge from './views/ChangeFacility/ConfirmMerge';
import SelectFacility from './views/ChangeFacility/SelectFacility';
import ConfirmAccountUsername from './views/ChangeFacility/ConfirmAccountUsername';
import ConfirmChangeFacility from './views/ChangeFacility/ConfirmChangeFacility';
import MergeAccountDialog from './views/ChangeFacility/MergeAccountDialog';
import ConfirmAccountDetails from './views/ChangeFacility/MergeAccountDialog/ConfirmAccountDetails';
import CreateAccount from './views/ChangeFacility/CreateAccount';
import CreatePassword from './views/ChangeFacility/CreatePassword';
import ChooseAdmin from './views/ChangeFacility/ChooseAdmin';
import MergeFacility from './views/ChangeFacility/MergeFacility';
import UsernameExists from './views/ChangeFacility/UsernameExists';
import MergeDifferentAccounts from './views/ChangeFacility/MergeDifferentAccounts';

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
      const { isUserLoggedIn } = useUser();
      if (!get(isUserLoggedIn)) {
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
      const { isUserLoggedIn } = useUser();
      if (!get(isUserLoggedIn)) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
  },

  {
    path: '/change_facility',
    name: 'CHANGE_FACILITY',
    component: ChangeFacility,
    beforeEnter(to, from, next) {
      const { isUserLoggedIn } = useUser();
      if (!get(isUserLoggedIn)) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
    children: [
      {
        path: 'change',
        name: 'SELECT_FACILITY',
        component: SelectFacility,
      },
      {
        path: 'confirm_change',
        name: 'CONFIRM_CHANGE_FACILITY',
        component: ConfirmChangeFacility,
      },

      {
        path: 'confirm_account',
        name: 'CONFIRM_ACCOUNT_USERNAME',
        component: ConfirmAccountUsername,
      },
      {
        path: 'target_password',
        name: 'TARGET_PASSWORD',
        component: CreatePassword,
      },
      {
        path: 'choose_admin',
        name: 'CHOOSE_ADMIN',
        component: ChooseAdmin,
      },
      {
        path: 'confirm_merge',
        name: 'CONFIRM_MERGE',
        component: ConfirmMerge,
      },
      {
        path: 'syncing_change_facility',
        name: 'SYNCING_CHANGE_FACILITY',
        component: MergeFacility,
      },
      {
        path: 'create_account',
        name: 'CREATE_ACCOUNT',
        component: CreateAccount,
      },
      {
        path: 'username_exists',
        name: 'USERNAME_EXISTS',
        component: UsernameExists,
      },
      {
        path: 'require_account_credentials',
        name: 'REQUIRE_ACCOUNT_CREDENTIALS',
        component: MergeAccountDialog,
      },
      {
        path: 'admin_password',
        name: 'ADMIN_PASSWORD',
        component: MergeAccountDialog,
      },
      {
        path: 'show_accounts',
        name: 'CONFIRM_DETAILS',
        component: ConfirmAccountDetails,
      },
      {
        path: 'merge_accounts',
        name: 'MERGE_ACCOUNTS',
        component: MergeDifferentAccounts,
      },
    ],
  },
  {
    path: '*',
    redirect: '/',
  },
];
