import router from 'kolibri.coreVue.router';
import { ContentWizardPages, PageNames } from '../constants';

export default {
  namespaced: true,
  state: {
    appBarTitle: '',
    query: {},
  },
  getters: {
    immersivePageIcon(state, getters, rootState) {
      if (
        rootState.pageName === PageNames.USER_PERMISSIONS_PAGE ||
        rootState.pageName === ContentWizardPages.SELECT_CONTENT
      ) {
        return 'arrow_back';
      }
      return 'close';
    },
    currentPageIsImmersive(state, getters, rootState) {
      return [
        ContentWizardPages.AVAILABLE_CHANNELS,
        ContentWizardPages.SELECT_CONTENT,
        PageNames.USER_PERMISSIONS_PAGE,
        'DELETE_CHANNELS',
        'EXPORT_CHANNELS',
        PageNames.REARRANGE_CHANNELS,
        'MANAGE_TASKS',
      ].includes(rootState.pageName);
    },
    inContentManagementPage(state, getters, rootState) {
      return [
        ContentWizardPages.AVAILABLE_CHANNELS,
        ContentWizardPages.SELECT_CONTENT,
        PageNames.MANAGE_CONTENT_PAGE,
        'DELETE_CHANNELS',
        'EXPORT_CHANNELS',
        PageNames.REARRANGE_CHANNELS,
        'MANAGE_TASKS',
      ].includes(rootState.pageName);
    },
    // NOTE: appBarTitle needs to be set imperatively in handlers and some components,
    // but the back-button location should be a function of pageName.
    immersivePageRoute(state, getters, rootState, rootGetters) {
      if (router.currentRoute.query.last) {
        return {
          name: router.currentRoute.query.last,
        };
      }
      // In all Import/Export pages, go back to ManageContentPage
      if (getters.inContentManagementPage) {
        // If a user is selecting content, they should return to the content
        // source that they're importing from using the query string.
        if (rootState.pageName === ContentWizardPages.SELECT_CONTENT) {
          return {
            name: ContentWizardPages.AVAILABLE_CHANNELS,
            query: state.query,
          };
        } else {
          return {
            name: PageNames.MANAGE_CONTENT_PAGE,
          };
        }
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
    SET_QUERY(state, query) {
      state.query = query;
    },
  },
};
