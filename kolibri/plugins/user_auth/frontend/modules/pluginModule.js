import Lockr from 'lockr';
import useFacility from 'kolibri-common/composables/useFacility';
import { clearError } from 'kolibri/utils/appError';
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
    reset() {
      clearError();
    },
    setFacilitiesAndConfig(store) {
      const { fetchFacilities, setFacilityId, selectedFacility } = useFacility();
      return fetchFacilities().then(() => {
        return setFacilityId(selectedFacility.value?.id || store.state.facilityId);
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
    async setFacilityId(store, { facilityId }) {
      const { setFacilityId } = useFacility();
      await setFacilityId(facilityId);
      store.commit('SET_FACILITY_ID', facilityId);
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
