import find from 'lodash/find';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import { pageNameToModuleMap, PageNames } from '../constants';
import classAssignMembers from './classAssignMembers';
import classEditManagement from './classEditManagement';
import classManagement from './classManagement';
import facilityConfig from './facilityConfig';
import userManagement from './userManagement';
import manageCSV from './manageCSV';
import importCSV from './importCSV';

export default {
  state() {
    return {};
  },
  actions: {
    preparePage(store, options = {}) {
      const { isAsync = true } = options;
      store.commit('CORE_SET_PAGE_LOADING', isAsync);
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
  getters: {
    activeFacilityId(state, getters, rootState) {
      // Return either the facility_id param in the route module,
      // or the userFacilityId value from core.session

      // For multi-facility case, only use facility_id if in route because userFacilityId
      // fallback would always navigate to our default facility, not multi-facility landing page
      const { userIsMultiFacilityAdmin, userFacilityId } = useUser();
      if (get(userIsMultiFacilityAdmin)) {
        return rootState.route.params.facility_id;
      }
      return rootState.route.params.facility_id || get(userFacilityId);
    },
    currentFacilityName(state, getters, rootState) {
      const match = find(rootState.core.facilities, { id: getters.activeFacilityId });
      return match ? match.name : '';
    },
    facilityPageLinks(state, getters) {
      // Use this getter to get Link objects that have the optional 'facility_id'
      // parameter if we're in a multi-facility situation
      const params = {};
      const { userIsMultiFacilityAdmin } = useUser();
      if (get(userIsMultiFacilityAdmin)) {
        params.facility_id = getters.activeFacilityId;
      }
      return {
        // Keys are the names of the components in routes.js
        ManageClassPage: {
          name: PageNames.CLASS_MGMT_PAGE,
          params,
        },
        UserPage: {
          name: PageNames.USER_MGMT_PAGE,
          params,
        },
        ClassEditPage: classId => {
          return {
            name: PageNames.CLASS_EDIT_MGMT_PAGE,
            params: { ...params, id: classId },
          };
        },
        CoachClassAssignmentPage: {
          name: PageNames.CLASS_ASSIGN_COACH,
          params,
        },
        LearnerClassEnrollmentPage: {
          name: PageNames.CLASS_ENROLL_LEARNER,
          params,
        },
        UserCreatePage: {
          name: PageNames.USER_CREATE_PAGE,
          params,
        },
        UserEditPage: {
          name: PageNames.USER_EDIT_PAGE,
          params,
        },
        AllFacilitiesPage: {
          name: PageNames.ALL_FACILITIES_PAGE,
        },
        DataPage: {
          name: PageNames.DATA_EXPORT_PAGE,
          params,
        },
        FacilityConfigPage: {
          name: PageNames.FACILITY_CONFIG_PAGE,
          params,
        },
        ImportCsvPage: {
          name: PageNames.IMPORT_CSV_PAGE,
          params,
        },
      };
    },
  },
  modules: {
    classManagement,
    classEditManagement,
    classAssignMembers,
    userManagement,
    facilityConfig,
    manageCSV,
    importCSV,
  },
};
