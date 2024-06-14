import store from 'kolibri.coreVue.vuex.store';
import redirectBrowser from 'kolibri.utils.redirectBrowser';

import UsersPage from './views/UsersPage';
import SelectFacility from './views/importUser/SelectFacility';
import ImportUserAsAdmin from './views/importUser/ImportUserAsAdmin';
import ImportUserWithCredentials from './views/importUser/ImportUserWithCredentials';

export default [
  {
    path: '/',
    name: 'USERS',
    component: UsersPage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        next();
      }
    },
  },
  {
    path: '/import/select_facility',
    name: 'SELECT_FACILITY',
    component: SelectFacility,
  },
  {
    path: '/import/credentials',
    name: 'IMPORT_USER_WITH_CREDENTIALS',
    component: ImportUserWithCredentials,
  },
  {
    path: '/import/as_admin',
    name: 'IMPORT_USER_AS_ADMIN',
    component: ImportUserAsAdmin,
  },
];
