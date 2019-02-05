import maxBy from 'lodash/maxBy';
import notificationsResource from '../../apiResources/notifications';
import { summarizedNotifications } from './getters';

export default {
  namespaced: true,
  state: {
    currentClassroomId: null,
    notifications: [],
    lastPolled: null,
    poller: null,
  },
  mutations: {
    SET_NOTIFICATIONS(state, notifications) {
      state.notifications = [...notifications];
    },
    APPEND_NOTIFICATIONS(state, notifications) {
      state.notifications = [...notifications, ...state.notifications];
    },
    SET_POLLER(state, poller) {
      state.poller = poller;
    },
    SET_CURRENT_CLASSROOM_ID(state, classroomId) {
      state.currentClassroomId = classroomId;
    },
  },
  getters: {
    summarizedNotifications,
    notificationsByUserId(state) {
      return function byUserId(userId) {
        return state.notifications.filter(notification => notification.user_id === userId);
      };
    },
    notificationsByLearnerGroupId(state, getters, rootState, rootGetters) {
      return function byLearnerGroupId(groupId) {
        const groupMembers =
          rootGetters['classSummary/notificationModuleData'].learnerGroups[groupId].member_ids;
        return state.notifications.filter(notification =>
          groupMembers.includes(notification.user_id)
        );
      };
    },
    maxNotificationIndex(state) {
      if (state.notifications.length > 0) {
        // IDs are being converted to strings for some reason
        return maxBy(state.notifications, n => Number(n.id)).id;
      }
      return 0;
    },
  },
  actions: {
    fetchNotificationsForClass(store, classroomId) {
      if (!store.state.currentClassroomId) {
        store.commit('SET_CURRENT_CLASSROOM_ID', classroomId);
      }
      return notificationsResource
        .fetchCollection({
          getParams: {
            collection_id: classroomId,
          },
        })
        .then(data => {
          store.commit('SET_NOTIFICATIONS', data.results);
          if (!store.state.poller) {
            store.dispatch('startingPolling', { coachesPolling: data.coaches_polling });
          }
        });
    },
    updateNotificationsForClass(store, { classroomId, after }) {
      return notificationsResource
        .fetchCollection({
          getParams: {
            collection_id: classroomId,
            after,
          },
          force: true,
        })
        .then(data => {
          if (data.results.length > 0) {
            store.commit('APPEND_NOTIFICATIONS', data.results);
            store.dispatch('classSummary/updateWithNotifications', data.results, { root: true });
          }
          store.dispatch('startingPolling', { coachesPolling: data.coaches_polling });
        });
    },
    startingPolling(store, { coachesPolling }) {
      const timeout = 2000 * Math.min(Math.max(coachesPolling, 1), 10);
      setTimeout(() => {
        store.dispatch('updateNotificationsForClass', {
          classroomId: store.state.currentClassroomId,
          after: store.getters.maxNotificationIndex,
        });
      }, timeout);
    },
    stopPollingAndClear(store) {
      clearInterval(store.state.poller);
      store.commit('SET_NOTIFICATIONS', null);
      store.commit('SET_POLLER', null);
    },
  },
};
