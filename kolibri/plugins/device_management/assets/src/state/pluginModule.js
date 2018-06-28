import find from 'lodash/find';
import mapValues from 'lodash/mapValues';
import { PageNames } from '../constants';
import mutations from './mutations';
import * as wizardGetters from './getters';
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

// HACK make every getter return undefined if not on a content page
function guardContentGetter(getter) {
  const unsafePages = [
    PageNames.DEVICE_INFO_PAGE,
    PageNames.MANAGE_PERMISSIONS_PAGE,
    PageNames.USER_PERMISSIONS_PAGE,
  ];
  return function safeGetter(state, getters) {
    if (unsafePages.includes(state.pageName) || !state.pageState.wizardState) {
      return undefined;
    }
    return getter(state, getters);
  };
}

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
  getters: {
    installedChannelList(state) {
      return state.pageState.channelList || [];
    },
    installedChannelListLoading(state) {
      return state.pageState.channelListLoading;
    },
    // Channels that are installed & also "available"
    installedChannelsWithResources(state, getters) {
      return getters.installedChannelList.filter(channel => channel.available);
    },
    channelIsInstalled(state, getters) {
      return function findChannel(channelId) {
        return find(getters.installedChannelList, { id: channelId });
      };
    },
    taskList(state) {
      return state.pageState.taskList;
    },
    // only hack the getters relying on wizardstate
    ...mapValues(wizardGetters, guardContentGetter),
  },
  mutations,
};
