import * as manageContentMutations from './manageContentMutations';
import * as contentWizardMutations from './contentWizardMutations';
import * as managePermissionsMutations from './managePermissionsMutations';
import * as deviceInfoMutations from './deviceInfoMutations';
import * as contentTransferMutations from './contentTransferMutations';

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, newPageState) {
    state.pageState = newPageState;
  },
  SET_WELCOME_MODAL_VISIBLE(state, visibility) {
    state.welcomeModalVisible = visibility;
  },
  SET_TOOLBAR_TITLE(state, newTitle) {
    state.pageState.toolbarTitle = newTitle;
  },
};

export default {
  ...mutations,
  ...manageContentMutations,
  ...contentWizardMutations,
  ...managePermissionsMutations,
  ...deviceInfoMutations,
  ...contentTransferMutations,
};
