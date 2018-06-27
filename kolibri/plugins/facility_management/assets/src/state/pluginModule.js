import * as classActions from './actions/class';
import * as dataActions from './actions/data';
import * as facilityConfigActions from './actions/facilityConfig';
import * as rolesActions from './actions/rolesActions';
import * as userActions from './actions/user';
import * as mutations from './mutations';
import displayModal from './actions/helpers/displayModal';

export default {
  state: {
    pageName: '',
    pageState: {
      channelList: [],
      wizardState: {},
      classes: [],
      users: [],
      taskList: [],
      modalShown: false,
      error: '',
      isBusy: false,
    },
  },
  actions: {
    displayModal,
    ...classActions,
    ...dataActions,
    ...facilityConfigActions,
    ...rolesActions,
    ...userActions,
  },
  mutations,
};
