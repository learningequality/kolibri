import { pageNameToModuleMap } from '../constants';
import profile from './profile';
import signIn from './signIn';
import signUp from './signUp';

export default {
  state: {
    facilityId: '',
    pageName: '',
  },
  actions: {
    resetAndSetPageName(store, { pageName }) {
      store.commit('SET_PAGE_NAME', pageName);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    setFacilitiesAndConfig(store) {
      return store.dispatch('getFacilities').then(() => {
        return store.dispatch('getFacilityConfig');
      });
    },
    resetModuleState(store, { fromRoute }) {
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
    SET_FACILITY_ID(state, facilityId) {
      state.facilityId = facilityId;
    },
  },
  modules: {
    profile,
    signIn,
    signUp,
  },
};
