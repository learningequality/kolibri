import omit from 'lodash/fp/omit';
import * as availableChannelsActions from './actions/availableChannelsActions';
import * as contentTreeViewerActions from './actions/contentTreeViewerActions';
import * as contentWizardActions from './actions/contentWizardActions';
import * as selectContentActions from './actions/selectContentActions';
import * as getters from './getters';

const omitPath = omit('path');

function defaultState() {
  return {
    status: '',
    pageName: '',
    driveList: [],
    transferType: '',
    availableChannels: [],
    selectedDrive: {},
    selectedPeer: {},
    availableSpace: null,
    transferFileSize: 0,
    transferResourceCount: 0,
    transferredChannel: {},
    currentTopicNode: {},
    path: [],
    pathCache: {},
    nodesForTransfer: {
      included: [],
      omitted: [],
    },
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions: {
    ...availableChannelsActions,
    ...contentTreeViewerActions,
    ...contentWizardActions,
    ...selectContentActions,
    updatePathBreadcrumbs(store, topic) {
      const cached = store.getters.cachedTopicPath(topic.id);
      if (cached) {
        store.commit('SET_PATH', cached);
        // store.state.path = cached;
      } else {
        let newCachedPath;
        // This only happens in showSelectChannel page when hydrating with channel node
        if (!topic.path) {
          newCachedPath = [omitPath(topic)];
        } else {
          // Every time else, path should be annotated by UI
          newCachedPath = topic.path.map(omitPath);
        }
        store.commit('ADD_PATH_TO_CACHE', { node: topic, path: newCachedPath });
        store.commit('SET_PATH', newCachedPath);
      }
    },
  },
  getters,
  mutations: {
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_SELECTED_PEER(state, selectedPeer) {
      state.selectedPeer = selectedPeer;
    },
    ADD_NODE_TO_INCLUDE_LIST(state, node) {
      state.nodesForTransfer.included.push(node);
    },
    REMOVE_NODE_FROM_INCLUDE_LIST(state, node) {
      const newList = state.nodesForTransfer.included.filter(n => n.id !== node.id);
      state.nodesForTransfer.included = newList;
    },
    REPLACE_INCLUDE_LIST(state, newList) {
      state.nodesForTransfer.included = newList;
    },
    ADD_NODE_TO_OMIT_LIST(state, node) {
      state.nodesForTransfer.omitted.push(node);
    },
    REMOVE_NODE_FROM_OMIT_LIST(state, node) {
      const newList = state.nodesForTransfer.omitted.filter(n => n.id !== node.id);
      state.nodesForTransfer.omitted = newList;
    },
    REPLACE_OMIT_LIST(state, newList) {
      state.nodesForTransfer.omitted = newList;
    },
    RESET_NODE_LISTS(state) {
      state.nodesForTransfer.included = [];
      state.nodesForTransfer.omitted = [];
    },
    SET_CURRENT_TOPIC_NODE(state, currentTopicNode) {
      state.currentTopicNode = currentTopicNode;
    },
    ADD_PATH_TO_CACHE(state, { node, path }) {
      state.pathCache[node.id] = path;
    },
    SET_PATH(state, path) {
      state.path = path;
    },
    SET_AVAILABLE_SPACE(state, space) {
      state.availableSpace = space;
    },
    SET_TRANSFER_SIZE(state, { transferFileSize, transferResourceCount }) {
      state.transferFileSize = transferFileSize;
      state.transferResourceCount = transferResourceCount;
    },
    SET_WIZARD_PAGENAME(state, pageName) {
      state.pageName = pageName;
    },
    SET_DRIVE_LIST(state, driveList) {
      state.driveList = driveList;
    },
    SET_AVAILABLE_CHANNELS(state, availableChannels) {
      state.availableChannels = availableChannels;
    },
    SET_TRANSFERRED_CHANNEL(state, transferredChannel) {
      state.transferredChannel = transferredChannel;
    },
    UPDATE_TRANSFERRED_CHANNEL(state, update) {
      state.transferredChannel = { ...state.transferredChannel, ...update };
    },
    SET_TRANSFER_TYPE(state, transferType) {
      state.transferType = transferType;
    },
    SET_WIZARD_STATUS(state, status) {
      state.status = status || '';
    },
    HYDRATE_SHOW_AVAILABLE_CHANNELS_PAGE(state, pageData) {
      state.availableChannels = pageData.availableChannels;
      state.selectedDrive = pageData.selectedDrive;
      state.transferType = pageData.transferType;
    },
    HYDRATE_SELECT_CONTENT_PAGE(state, pageData) {
      state.availableSpace = pageData.availableSpace;
      state.selectedDrive = pageData.selectedDrive;
      state.transferredChannel = pageData.transferredChannel;
      state.transferType = pageData.transferType;
    },
  },
};
