import Lockr from 'lockr';
import { ComponentMap, pageNameToModuleMap } from '../constants';
import profile from './profile';
import signIn from './signIn';

export default {
  state() {
    return {
      facilityId: Lockr.get('facilityId') || null,
      pageName: '',
      appBarTitle: '',
    };
  },
  actions: {
    reset(store) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    setFacilitiesAndConfig(store) {
      return store.dispatch('getFacilities').then(() => {
        return store.dispatch('getFacilityConfig', store.getters.selectedFacility.id);
      });
    },
    resetModuleState(store, { toRoute, fromRoute }) {
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (toRoute.name === ComponentMap.SIGN_UP && fromRoute.name === ComponentMap.SIGN_UP) {
        return;
      }
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
    setFacilityId(store, { facilityId }) {
      store.commit('SET_FACILITY_ID', facilityId);
      return store.dispatch('getFacilityConfig', facilityId);
    },
  },
  getters: {
    // Return the facility that was last selected or fallback to the default facility.
    selectedFacility(state, getters) {
      const selectedFacility = getters.facilities.find(f => f.id === state.facilityId);
      if (selectedFacility) {
        return selectedFacility;
      } else {
        return getters.facilities.find(f => f.id === getters.currentFacilityId) || null;
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
    SET_APPBAR_TITLE(state, appBarTitle) {
      state.appBarTitle = appBarTitle;
    },
  },
  modules: {
    profile,
    signIn,
  },
};
