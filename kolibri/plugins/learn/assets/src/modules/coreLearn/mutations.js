export default {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_EXAM_LOG(state, examLog) {
    state.examLog = examLog;
  },
  SET_EXAM_ATTEMPT_LOGS(state, examAttemptLogs) {
    const newState = Object.assign({}, state.examAttemptLogs);
    Object.keys(examAttemptLogs).forEach(contentId => {
      if (!newState[contentId]) {
        newState[contentId] = {};
      }
      Object.assign(newState[contentId], examAttemptLogs[contentId]);
    });
    state.examAttemptLogs = newState;
  },
  RESET_EXAM_ATTEMPT_LOGS(state) {
    state.examAttemptLogs = {};
  },
  LEARN_SET_MEMBERSHIPS(state, memberships) {
    state.memberships = memberships;
  },
};
