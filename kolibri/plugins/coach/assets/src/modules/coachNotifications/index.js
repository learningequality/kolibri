import notificationsResource from '../../apiResources/new/notifications';
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
    SET_LAST_POLLED_TO_NOW(state) {
      state.lastPolled = Date.now();
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
  },
  actions: {
    fetchNotificationsForClass(store, classroomId) {
      if (!store.state.currentClassroomId) {
        store.commit('SET_CURRENT_CLASSROOM_ID', classroomId);
      }
      const after = Date.now();
      return notificationsResource
        .fetchCollection({
          getParams: {
            collection_id: classroomId,
          },
        })
        .then(data => {
          store.commit('SET_NOTIFICATIONS', data);
          if (!store.state.poller) {
            store.dispatch('startPolling', after);
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
        })
        .then(data => {
          if (data.length > 0) {
            store.commit('APPEND_NOTIFICATIONS', data);
          }
        });
    },
    startPolling(store, after) {
      let lastPolled = after;
      const poller = setInterval(() => {
        const afterCopy = lastPolled;
        // This just gets everything, until I figure out how time fiter works
        store.dispatch('updateNotificationsForClass', {
          classroomId: store.state.currentClassroomId,
          after: afterCopy,
        });
        lastPolled = Date.now();
      }, 5000);
      store.commit('SET_POLLER', poller);
    },
    stopPolling(store) {
      clearInterval(store.state.poller);
      store.commit('SET_POLLER', null);
    },
  },
};
