import * as contentMutations from './contentMutations';
import * as contentWizardMutations from './contentWizardMutations';

function SET_PAGE_NAME(state, name) {
  state.pageName = name;
}

const mutations = {
  SET_PAGE_NAME,
}

export default Object.assign(
  mutations,
  contentMutations,
  contentWizardMutations
);
