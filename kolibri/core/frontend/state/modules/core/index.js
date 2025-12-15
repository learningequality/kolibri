import plugin_data from 'kolibri-plugin-data';
import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';

export default {
  state() {
    return {
      error: '',
      loading: true,
      pageSessionId: 0,
      notifications: [],
      allowRemoteAccess: plugin_data.allowRemoteAccess,
      // facility
      pageVisible: true,
    };
  },
  getters,
  actions,
  mutations,
};
