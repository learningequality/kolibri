import * as manageContentMutations from './manageContentMutations';
import * as contentWizardMutations from './contentWizardMutations';
import * as managePermissionsMutations from './managePermissionsMutations';

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
};

export default Object.assign(
  {},
  mutations,
  manageContentMutations,
  contentWizardMutations,
  managePermissionsMutations
);
