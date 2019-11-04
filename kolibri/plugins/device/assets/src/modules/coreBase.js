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
