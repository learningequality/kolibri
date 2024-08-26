import sessionModule from '../session';
import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';
import plugin_data from 'plugin_data';

export default {
  state() {
    return {
      error: '',
      loading: true,
      pageSessionId: 0,
      totalProgress: null,
      notifications: [],
      channels: {
        list: [],
        currentId: null,
      },
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
