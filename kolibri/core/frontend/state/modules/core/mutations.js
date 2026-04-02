export default {
  CORE_SET_PAGE_LOADING(state, value) {
    state.loading = value;
  },
  CORE_SET_ERROR(state, error) {
    state.error = error;
  },
  CORE_SET_NOTIFICATIONS(state, notifications) {
    state.notifications = notifications;
  },
  CORE_REMOVE_NOTIFICATION(state, notification_id) {
    state.notifications = state.notifications.filter(obj => obj.id !== notification_id);
  },
  CORE_SET_PAGE_VISIBILITY(state, visible) {
    state.pageVisible = visible;
  },
};
