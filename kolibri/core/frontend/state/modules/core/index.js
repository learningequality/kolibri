import plugin_data from 'kolibri-plugin-data';
import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';

export default {
  state() {
    return {
      error: '',
      loading: true,
      allowRemoteAccess: plugin_data.allowRemoteAccess,
    };
  },
  getters,
  actions,
  mutations,
};
