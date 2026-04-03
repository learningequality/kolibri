import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';

export default {
  state() {
    return {
      error: '',
      loading: true,
    };
  },
  getters,
  actions,
  mutations,
};
