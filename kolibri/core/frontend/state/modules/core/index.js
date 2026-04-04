import * as actions from './actions';
import mutations from './mutations';

export default {
  state() {
    return {
      error: '',
    };
  },
  actions,
  mutations,
};
