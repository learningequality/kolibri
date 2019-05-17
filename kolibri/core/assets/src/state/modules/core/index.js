import connectionModule from '../connection';
import loggingModule from '../logging';
import sessionModule from '../session';
import snackbarModule from '../snackbar';
import * as getters from './getters';
import * as actions from './actions';
import mutations from './mutations';

export default {
  state: {
    error: '',
    blockDoubleClicks: false,
    loading: true,
    pageSessionId: 0,
    loginError: null,
    signInBusy: false,
    totalProgress: null,
    notifications: [],
    channels: {
      list: [],
      currentId: null,
    },
    // facility
    facilityConfig: {},
    facilities: [],
    pageVisible: true,
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
