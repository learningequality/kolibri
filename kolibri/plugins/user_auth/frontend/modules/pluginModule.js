import Lockr from 'lockr';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { ComponentMap, pageNameToModuleMap } from '../constants';
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
    setFacilitiesAndConfig() {
      const { getFacilities, getFacilityConfig, selectedFacility } = useFacilities();
      return getFacilities().then(() => {
        return getFacilityConfig(selectedFacility.value.id);
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
      const { getFacilityConfig } = useFacilities();
      store.commit('SET_FACILITY_ID', facilityId);
      return getFacilityConfig(facilityId);
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
    signIn,
  },
};
