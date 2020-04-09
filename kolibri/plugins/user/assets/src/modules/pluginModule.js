import Lockr from 'lockr';
import { PageNames, pageNameToModuleMap } from '../constants';
import profile from './profile';
import signIn from './signIn';

export default {
  state: {
    facilityId: Lockr.get('facilityId') || null,
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
    resetModuleState(store, { toRoute, fromRoute }) {
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (toRoute.name === PageNames.SIGN_UP && fromRoute.name === PageNames.SIGN_UP) {
        return;
      }
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
    setFacilityId(store, { facilityId }) {
      store.commit('SET_FACILITY_ID', facilityId);
    },
  },
  getters: {
    selectedFacility(state, getters) {
      const selectedFacility = getters.facilities.find(f => f.id === state.facilityId);
      if (selectedFacility) {
        return selectedFacility;
      } else {
        return getters.facilities.find(f => (f.id = getters.currentFacilityId)) || null;
      }
    },
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
    SET_FACILITY_ID(state, facilityId) {
      Lockr.set('facilityId', facilityId);
      state.facilityId = facilityId;
    },
  },
  modules: {
    profile,
    signIn,
  },
};
