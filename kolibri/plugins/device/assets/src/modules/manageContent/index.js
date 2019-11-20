import find from 'lodash/find';
import wizard from '../wizard';
import { TaskTypes, TaskStatuses, taskIsClearable } from '../../constants';
import actions from './actions';

function defaultState() {
  return {
    channelList: [],
    channelListLoading: false,
    taskList: [],
    watchedTaskId: null,
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
    SET_WATCHED_TASK_ID(state, taskId) {
      state.watchedTaskId = taskId;
    },
    ADD_TO_CHANNEL_LIST(state, channel) {
      state.channelList.push(channel);
    },
    REMOVE_FROM_CHANNEL_LIST(state, channelId) {
      state.channelList = state.channelList.filter(channel => channel.id !== channelId);
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
    channelIsBeingDeleted(state) {
      return function beingDeleted(channelId) {
        const match = find(state.taskList, {
          type: TaskTypes.DELETECHANNEL,
          channel_id: channelId,
        });
        if (match) {
          return !taskIsClearable(match);
        }
        return false;
      };
    },
    taskFinished(state) {
      return function taskFinished(taskId) {
        if (!taskId) {
          return null;
        }
        const match = find(state.taskList, { id: taskId });
        if (match && taskIsClearable(match)) {
          return match.id;
        }
        return null;
      };
    },
    // Tasks that are active, complete, or failed.
    // Canceling and canceled tasks are filtered here
    // to hide them from users, but still let us clean
    // them up when finished.
    activeTaskList(state) {
      return state.taskList.filter(
        task => task.status !== TaskStatuses.CANCELING && task.status !== TaskStatuses.CANCELED
      );
    },
    managedTasks(state) {
      // Tasks that we want to show in the task manager - ignore channel metadata tasks here.
      return state.taskList.filter(
        task => ![TaskTypes.REMOTECHANNELIMPORT, TaskTypes.DISKCHANNELIMPORT].includes(task.type)
      );
    },
  },
  actions,
  modules: {
    wizard,
  },
};
