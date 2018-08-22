import * as classesMutations from './classesMutations';

export default {
  ...classesMutations,
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_EXAM_LOG(state, examLog) {
    state.examLog = examLog;
  },

  SET_CONTENT(state, content) {
    state.pageState.content = content;
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
  SET_QUESTIONS_ANSWERED(state, questionsAnswered) {
    state.pageState.questionsAnswered = questionsAnswered;
  },
  LEARN_SET_MEMBERSHIPS(state, memberships) {
    state.learnAppState.memberships = memberships;
  },
  SET_NODE_PROGRESS(state, progressArray) {
    progressArray.forEach(progress => {
      const contentNode = state.pageState.contents.find(node => node.id === progress.pk);
      if (contentNode) {
        contentNode.progress = progress.progress_fraction;
      }
    });
  },
  SET_RECOMMENDED_NODES_PROGRESS(state, progressArray) {
    ['nextSteps', 'popular', 'resume'].forEach(function(key) {
      progressArray.forEach(progress => {
        const contentNode = state.pageState[key].find(node => node.id === progress.pk);
        if (contentNode) {
          contentNode.progress = progress.progress_fraction;
        }
      });
    });
  },
};
