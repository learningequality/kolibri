import connectionModule from '../connection';
import loggingModule from '../logging';
import sessionModule from '../session';
import snackbarModule from '../snackbar';
import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';
import plugin_data from 'plugin_data';

export default {
  state() {
    return {
      error: '',
      blockDoubleClicks: false,
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
    connection: connectionModule,
    logging: loggingModule,
    session: sessionModule,
    snackbar: snackbarModule,
  },
};
