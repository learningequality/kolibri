import { ContentWizardPages, PageNames } from '../constants';

export default {
  namespaced: true,
  state: {
    appBarTitle: '',
  },
  getters: {
    immersivePageIcon(state, getters, rootState) {
      if (rootState.pageName === PageNames.USER_PERMISSIONS_PAGE) {
        return 'arrow_back';
      }
      return 'close';
    },
    currentPageIsImmersive(state, getters, rootState) {
      return [
        ContentWizardPages.AVAILABLE_CHANNELS,
        ContentWizardPages.SELECT_CONTENT,
        PageNames.USER_PERMISSIONS_PAGE,
      ].includes(rootState.pageName);
    },
    inContentManagementPage(state, getters, rootState) {
      return [
        ContentWizardPages.AVAILABLE_CHANNELS,
        ContentWizardPages.SELECT_CONTENT,
        PageNames.MANAGE_CONTENT_PAGE,
      ].includes(rootState.pageName);
    },
    // NOTE: appBarTitle needs to be set imperatively in handlers and some components,
    // but the back-button location should be a function of pageName.
    immersivePageRoute(state, getters, rootState, rootGetters) {
      // In all Import/Export pages, go back to ManageContentPage
      if (getters.inContentManagementPage) {
        return {
          name: PageNames.MANAGE_CONTENT_PAGE,
        };
      } else if (rootState.pageName === PageNames.USER_PERMISSIONS_PAGE) {
        // If Admin, goes back to ManagePermissionsPage
        if (rootGetters.isSuperuser) {
          return { name: PageNames.MANAGE_PERMISSIONS_PAGE };
        } else {
          // If Non-Admin, go to ManageContentPAge
          return { name: PageNames.MANAGE_CONTENT_PAGE };
        }
      } else {
        return {};
      }
    },
  },
  mutations: {
    SET_APP_BAR_TITLE(state, appBarTitle) {
      state.appBarTitle = appBarTitle;
    },
  },
};
