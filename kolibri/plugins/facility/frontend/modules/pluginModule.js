import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { clearError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { selectedFacilityId } from 'kolibri-common/composables/useFacility';
import { pageNameToModuleMap, PageNames } from '../constants';
import classAssignMembers from './classAssignMembers';
import classEditManagement from './classEditManagement';
import classManagement from './classManagement';
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
      pageLoading.value = isAsync;
      clearError();
    },
    resetModuleState(store, { fromRoute, toRoute }) {
      const moduleName = pageNameToModuleMap[fromRoute.name];
      // Don't clear out if going from USER_MGMT_PAGE to USER_CREATE/EDIT_PAGE to preserve
      // big list of facility users for duplicate-username validation
      if (
        fromRoute.name === PageNames.USER_MGMT_PAGE &&
        toRoute.name === PageNames.USER_EDIT_PAGE
      ) {
        return;
      }
      if (moduleName) {
        return store.commit(`${moduleName}/RESET_STATE`);
      }
    },
  },
  getters: {
    activeFacilityId() {
      return get(selectedFacilityId);
    },
    facilityPageLinks(state, getters) {
      // Use this getter to get Link objects that have the optional 'facility_id'
      // parameter if we're in a multi-facility situation
      const params = {};
      const { userIsMultiFacilityAdmin } = useFacilities();
      if (userIsMultiFacilityAdmin.value) {
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
        UsersRootPage: {
          name: PageNames.USER_MGMT_PAGE,
          params,
        },
        NewUsersPage: {
          name: PageNames.NEW_USERS_PAGE,
          params,
        },
        UsersTrashPage: {
          name: PageNames.USERS_TRASH_PAGE,
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
          name: PageNames.ADD_NEW_USER_SIDE_PANEL__NEW_USERS,
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
    manageCSV,
    importCSV,
  },
};
