export default {
  CORE_SET_FACILITY_CONFIG(state, facilityConfig) {
    state.facilityConfig = facilityConfig;
  },
  CORE_SET_FACILITIES(state, facilities) {
    state.facilities = facilities;
  },
  CORE_SET_PAGE_LOADING(state, value) {
    const update = { loading: value };
    if (value) {
      Object.assign(update, { pageSessionId: state.pageSessionId + 1 });
    }
    Object.assign(state, update);
  },
  CORE_SET_ERROR(state, error) {
    state.error = error;
  },
  CORE_BLOCK_CLICKS(state, blocked) {
    state.blockDoubleClicks = blocked;
  },
  SET_TOTAL_PROGRESS(state, progress) {
    state.totalProgress = progress;
  },
  INCREMENT_TOTAL_PROGRESS(state, progress) {
    state.totalProgress += progress;
  },
  SET_CORE_CHANNEL_LIST(state, channelList) {
    state.channels.list = channelList;
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
