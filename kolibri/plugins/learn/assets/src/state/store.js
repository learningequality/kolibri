import * as constants from '../constants';

export const initialState = {
  pageName: constants.PageNames.TOPICS_CHANNEL,
  pageState: {
    topics: [],
    contents: [],
    searchTerm: '',
  },
  learnAppState: {
    memberships: [],
  },
  examLog: {},
  examAttemptLogs: {},
};

export const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_FEATURED_CHANNEL_CONTENTS(state, channelId, contents) {
    state.pageState.featured[channelId] = contents;
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
  SET_QUESTIONS_ANSWERED(state, questionsAnswered) {
    state.pageState.questionsAnswered = questionsAnswered;
  },
  LEARN_SET_MEMBERSHIPS(state, memberships) {
    state.learnAppState.memberships = memberships;
  },
  SET_TOPIC_PROGRESS(state, progressArray) {
    progressArray.forEach(progress => {
      const topic = state.pageState.contents.find(subtopic => subtopic.id === progress.pk);
      topic.progress = progress.progress_fraction;
    });
  },
};
