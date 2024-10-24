import plugin_data from 'plugin_data';
import sessionModule from '../session';
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
      facilityConfig: {},
      facilities: [],
      pageVisible: true,
    };
  },
  getters,
  actions,
  mutations,
  modules: {
    session: sessionModule,
  },
};
