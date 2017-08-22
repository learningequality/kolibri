import * as contentMutations from './contentMutations';
import * as contentWizardMutations from './contentWizardMutations';

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, newPageState) {
    state.pageState = newPageState;
  },
};

export default Object.assign({}, mutations, contentMutations, contentWizardMutations);
