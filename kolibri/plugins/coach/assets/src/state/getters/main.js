import { RecentReports, TopicReports, LearnerReports } from '../../constants';

export function isRecentPage(state) {
  return RecentReports.includes(state.pageName);
}

export function isTopicPage(state) {
  return TopicReports.includes(state.pageName);
}

export function isLearnerPage(state) {
  return LearnerReports.includes(state.pageName);
}

export function numberOfAssignedClassrooms(state) {
  return state.classList.length;
}
