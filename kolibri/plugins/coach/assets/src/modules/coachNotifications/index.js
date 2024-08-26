import orderBy from 'lodash/orderBy';
import uniqBy from 'lodash/uniqBy';
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
      state.notifications = orderBy([...notifications], 'timestamp', ['desc']);
    },
    INSERT_NOTIFICATIONS(state, notifications) {
      state.notifications = uniqBy(
        orderBy([...state.notifications, ...notifications], 'timestamp', ['desc']),
        'id',
      );
    },
    SET_CURRENT_CLASSROOM_ID(state, classroomId) {
      state.currentClassroomId = classroomId;
    },
  },
  getters: {
    allNotifications,
    summarizedNotifications,
    maxNotificationTimestamp(state) {
      if (state.notifications.length > 0) {
        return state.notifications[0].timestamp;
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
          store.dispatch('checkEmptySummarizedNotifications');
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
      const params = {
        classroom_id: classroomId,
      };
      if (after) {
        params.after = after;
      }
      return notificationsResource
        .fetchCollection({
          getParams: params,
          force: true,
        })
        .then(data => {
          if (data.results.length > 0) {
            store.commit('INSERT_NOTIFICATIONS', data.results);
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
            before: lastNotification.timestamp,
            limit,
            ...(params || {}),
          },
          force: true,
        })
        .then(data => {
          if (data.results.length > 0) {
            store.commit('INSERT_NOTIFICATIONS', data.results);
            if (data.more_results) {
              store.dispatch('checkEmptySummarizedNotifications');
            }
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
          after: store.getters.maxNotificationTimestamp,
        });
      }, timeout);
    },
    checkEmptySummarizedNotifications(store) {
      if (store.getters.summarizedNotifications.length === 0) {
        store.dispatch('moreNotificationsForClass');
      }
    },
  },
};
