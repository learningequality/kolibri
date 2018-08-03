import { pageNameToModuleMap } from '../constants';
import classAssignMembers from './classAssignMembers';
import classEditManagement from './classEditManagement';
import classManagement from './classManagement';
import facilityConfig from './facilityConfig';
import userManagement from './userManagement';

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
    resetModuleState(store, { fromRoute }) {
      const moduleName = pageNameToModuleMap[fromRoute.name];
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
  },
};
