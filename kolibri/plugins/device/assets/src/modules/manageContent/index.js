import find from 'lodash/find';
import findLastIndex from 'lodash/findLastIndex';
import { TaskTypes, TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import wizard from '../wizard';
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
  state: defaultState,
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
    installedChannelsWithResources(state, getters) {
      const channels = state.channelList.filter(channel => channel.available);

      return channels.map(channel => {
        const taskIndex = findLastIndex(getters.managedTasks, task => {
          const isLatest = task => {
            const tasksWithSameChannelId = getters.managedTasks.filter(
              t =>
                t.extra_metadata.channel_id === channel.id && t.status === TaskStatuses.COMPLETED,
            );
            const maxScheduledDatetime = tasksWithSameChannelId.reduce(
              (max, current) =>
                current.scheduled_datetime > max ? current.scheduled_datetime : max,
              tasksWithSameChannelId[0].scheduled_datetime,
            );
            return task.scheduled_datetime === maxScheduledDatetime;
          };
          return (
            // corresponds to latest changes on channel
            ![TaskTypes.DISKCONTENTEXPORT, TaskTypes.DISKEXPORT, TaskTypes.DELETECHANNEL].includes(
              task.type,
            ) &&
            task.extra_metadata.channel_id === channel.id &&
            task.status === TaskStatuses.COMPLETED &&
            isLatest(task)
          );
        });
        return {
          ...channel,
          taskIndex,
        };
      });
    },
    channelIsInstalled(state) {
      return function findChannel(channelId) {
        return find(state.channelList, { id: channelId, available: true });
      };
    },
    channelIsOnDevice(state) {
      // Channel data just needs to exist, but doesn't need to be available
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
          return !match.clearable;
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
        if (match && match.clearable) {
          return match.id;
        }
        return null;
      };
    },
    managedTasks(state) {
      // Tasks that we want to show in the task manager - ignore channel metadata tasks here.
      return state.taskList.filter(
        task =>
          ![
            TaskTypes.REMOTECHANNELIMPORT,
            TaskTypes.DISKCHANNELIMPORT,
            TaskTypes.REMOTECHANNELDIFFSTATS,
            TaskTypes.LOCALCHANNELDIFFSTATS,
          ].includes(task.type),
      );
    },
  },
  actions,
  modules: {
    wizard,
  },
};
