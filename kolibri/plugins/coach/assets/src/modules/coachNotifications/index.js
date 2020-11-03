import maxBy from 'lodash/maxBy';
import sortBy from 'lodash/sortBy';
import notificationsResource from '../../apiResources/notifications';
import { allNotifications, summarizedNotifications } from './getters';

export default {
  namespaced: true,
  state: {
    currentClassroomId: null,
    notifications: [],
  },
  mutations: {
    SET_NOTIFICATIONS(state, notifications) {
      state.notifications = [...notifications];
    },
    APPEND_NOTIFICATIONS(state, notifications) {
      state.notifications = [...notifications, ...state.notifications];
    },
    INSERT_NOTIFICATIONS(state, notifications) {
      state.notifications = sortBy([state.notifications, ...notifications], '-id');
    },
    SET_CURRENT_CLASSROOM_ID(state, classroomId) {
      state.currentClassroomId = classroomId;
    },
  },
  getters: {
    allNotifications,
    summarizedNotifications,
    maxNotificationIndex(state) {
      if (state.notifications.length > 0) {
        // IDs are being converted to strings for some reason
        return maxBy(state.notifications, n => Number(n.id)).id;
      }
      return 0;
    },
  },
  actions: {
    stopPolling(store) {
      store.commit('SET_CURRENT_CLASSROOM_ID', '');
      // Need to clear out 403 error in store to prevent auth message from showing
      // in other places.
      store.commit('CORE_SET_ERROR', '', { root: true });
    },
    fetchNotificationsForClass(store, classroomId) {
      if (!store.state.currentClassroomId) {
        store.commit('SET_CURRENT_CLASSROOM_ID', classroomId);
      }
      return notificationsResource
        .fetchCollection({
          getParams: {
            classroom_id: classroomId,
          },
        })
        .then(data => {
          store.commit('SET_NOTIFICATIONS', data.results);
          if (!store.state.poller) {
            store.dispatch('startingPolling', { coachesPolling: data.coaches_polling });
          }
        })
        .catch(() => {
          if (!store.state.poller) {
            store.dispatch('startingPolling', { coachesPolling: 0 });
          }
        });
    },
    updateNotificationsForClass(store, { classroomId, after }) {
      // stop polling if not viewing a classroom anymore
      if (!store.state.currentClassroomId) {
        return;
      }
      return notificationsResource
        .fetchCollection({
          getParams: {
            classroom_id: classroomId,
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
        })
        .catch(() => {
          store.dispatch('startingPolling', { coachesPolling: 0 });
        });
    },
    moreNotificationsForClass(store, params) {
      const classroomId = store.state.currentClassroomId;
      const lastNotification = store.state.notifications.slice(-1)[0];
      // don't fetch if no current classroom
      if (!classroomId || !lastNotification || lastNotification.id <= 1) {
        return Promise.resolve(false);
      }
      const limit = 25;
      return notificationsResource
        .fetchCollection({
          getParams: {
            classroom_id: classroomId,
            before: lastNotification.id,
            limit,
            ...(params || {}),
          },
          force: true,
        })
        .then(data => {
          if (data.results.length > 0) {
            store.commit('INSERT_NOTIFICATIONS', data.results);
            return data.more_results;
          }
          return false;
        })
        .catch(() => {
          return false;
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
  },
};
