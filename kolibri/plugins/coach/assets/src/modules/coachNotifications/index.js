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
    SET_LAST_POLLED_TO_NOW(state) {
      state.lastPolled = Date.now();
    },
    SET_POLLER(state, poller) {
      state.poller = poller;
    },
  },
  getters: {
    summarizedNotifications,
  },
  actions: {
    fetchNotificationsForClass(store, classroomId) {
      return notificationsResource
        .fetchCollection({
          getParams: {
            collection_id: classroomId || 'ba115ca8cf2675293dbff1dbb85f1403',
          },
        })
        .then(data => {
          store.commit('SET_NOTIFICATIONS', data);
          store.dispatch('startPolling');
          store.commit('SET_LAST_POLLED_TO_NOW');
        });
    },
    startPolling(store) {
      const poller = setInterval(() => {
        console.log('yo');
      }, 5000);
      store.commit('SET_POLLER', poller);
    },
    stopPolling(store) {
      clearInterval(store.state.poller);
      store.commit('SET_POLLER', null);
    },
  },
};
