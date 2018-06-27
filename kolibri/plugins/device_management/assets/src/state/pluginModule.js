import mutations from './mutations';
import * as getters from './getters';
import * as availableChannelsActions from './actions/availableChannelsActions';
import * as contentTransferActions from './actions/contentTransferActions';
import * as contentTreeViewerActions from './actions/contentTreeViewerActions';
import * as contentWizardActions from './actions/contentWizardActions';
import * as deviceInfoActions from './actions/deviceInfoActions';
import * as manageContentActions from './actions/manageContentActions';
import * as managePermissionsActions from './actions/managePermissionsActions';
import * as selectContentActions from './actions/selectContentActions';
import * as taskActions from './actions/taskActions';
import { manageContentPageState } from './wizardState';

export default {
  state: {
    pageName: '',
    pageState: {
      ...manageContentPageState(),
    },
    welcomeModalVisible: false,
  },
  actions: {
    ...availableChannelsActions,
    ...contentTransferActions,
    ...contentTreeViewerActions,
    ...contentWizardActions,
    ...deviceInfoActions,
    ...manageContentActions,
    ...managePermissionsActions,
    ...selectContentActions,
    ...taskActions,
  },
  getters,
  mutations,
};
