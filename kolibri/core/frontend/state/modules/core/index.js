import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';

export default {
  state() {
    return {
      error: '',
      loading: true,
      // facility
      pageVisible: true,
    };
  },
  getters,
  actions,
  mutations,
};
