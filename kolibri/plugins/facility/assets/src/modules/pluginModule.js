import { pageNameToModuleMap, PageNames } from '../constants';
import classAssignMembers from './classAssignMembers';
import classEditManagement from './classEditManagement';
import classManagement from './classManagement';
import facilityConfig from './facilityConfig';
import userManagement from './userManagement';
import manageCSV from './manageCSV';
import manageSync from './manageSync';

export default {
  state: {
    pageName: '',
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
    UPDATE_CURRENT_USER_KIND(state, newKind) {
      state.core.session.kind = newKind;
    },
  },
  actions: {
    preparePage(store, { name, isAsync = true }) {
      store.commit('CORE_SET_PAGE_LOADING', isAsync);
      store.commit('SET_PAGE_NAME', name);
      store.commit('CORE_SET_ERROR', null);
    },
    resetModuleState(store, { fromRoute, toRoute }) {
      const moduleName = pageNameToModuleMap[fromRoute.name];
      // Don't clear out if going from USER_MGMT_PAGE to USER_CREATE/EDIT_PAGE to preserve
      // big list of facility users for duplicate-username validation
      if (
        fromRoute.name === PageNames.USER_MGMT_PAGE &&
        (toRoute.name === PageNames.USER_CREATE_PAGE || toRoute.name === PageNames.USER_EDIT_PAGE)
      ) {
        return;
      }
      if (moduleName) {
        return store.commit(`${moduleName}/RESET_STATE`);
      }
    },
  },
  modules: {
    classManagement,
    classEditManagement,
    classAssignMembers,
    userManagement,
    facilityConfig,
    manageCSV,
    manageSync,
  },
};
