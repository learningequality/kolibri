import { pageNameToModuleMap, PageNames, ContentWizardPages } from '../constants';
import deviceInfo from './deviceInfo';
import manageContent from './manageContent';
import managePermissions from './managePermissions';
import userPermissions from './userPermissions';
import coreBase from './coreBase';

export default {
  state: {
    pageName: '',
    welcomeModalVisible: false,
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
    SET_WELCOME_MODAL_VISIBLE(state, visibility) {
      state.welcomeModalVisible = visibility;
    },
  },
  actions: {
    preparePage(store, { name, isAsync = true }) {
      store.commit('CORE_SET_PAGE_LOADING', isAsync);
      store.commit('SET_PAGE_NAME', name);
      store.commit('CORE_SET_ERROR', null);
    },
    resetModuleState(store, { toRoute, fromRoute }) {
      // Don't reset when going to available channels page
      if (
        fromRoute.name === PageNames.MANAGE_CONTENT_PAGE &&
        toRoute.name === ContentWizardPages.AVAILABLE_CHANNELS
      ) {
        return;
      }
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
  },
  modules: {
    // DEVICE_INFO_PAGE
    deviceInfo,
    // MANAGE_PERMISSIONS_PAGE
    managePermissions,
    // USER_PERMISSIONS_PAGE
    userPermissions,
    // MANAGE_CONTENT_PAGE + wizards
    manageContent,
    // CoreBase properties
    coreBase,
  },
};
