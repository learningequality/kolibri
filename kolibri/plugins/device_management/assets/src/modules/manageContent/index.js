import find from 'lodash/find';
import wizard from '../wizard';
import actions from './actions';

function defaultState() {
  return {
    channelList: [],
    channelListLoading: false,
    taskList: [],
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_CHANNEL_LIST(state, channelList) {
      state.channelList = [...channelList];
    },
    SET_CHANNEL_LIST_LOADING(state, isLoading) {
      state.channelListLoading = isLoading;
    },
    SET_TASK_LIST(state, taskList) {
      state.taskList = [...taskList];
    },
  },
  getters: {
    // Channels that are installed & also "available"
    installedChannelsWithResources(state) {
      return state.channelList.filter(channel => channel.available);
    },
    channelIsInstalled(state) {
      return function findChannel(channelId) {
        return find(state.channelList, { id: channelId });
      };
    },
  },
  actions,
  modules: {
    wizard,
  },
};
