import * as Constants from '../../constants';

function isRecentPage(state) {
  return Constants.RecentReports.includes(state.pageName);
}

function isTopicPage(state) {
  return Constants.TopicReports.includes(state.pageName);
}

function isLearnerPage(state) {
  return Constants.LearnerReports.includes(state.pageName);
}

export { isRecentPage, isTopicPage, isLearnerPage };
