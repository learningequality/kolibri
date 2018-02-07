import * as Constants from '../../constants';
import { LessonsPageNames } from '../../lessonsConstants';

function className(state) {
  const cls = state.classList.find(thisClass => thisClass.id === state.classId);
  if (cls) {
    return cls.name;
  }
  return '';
}

function classMemberCount(state) {
  const cls = state.classList.find(thisClass => thisClass.id === state.classId);
  if (cls) {
    return cls.memberCount;
  }
  return 0;
}

function isRecentPage(state) {
  return Constants.RecentReports.includes(state.pageName);
}

function isTopicPage(state) {
  return Constants.TopicReports.includes(state.pageName);
}

function isLearnerPage(state) {
  return Constants.LearnerReports.includes(state.pageName);
}

// Whenever page is immersive, disable core-page and other default navigations
function currentPageIsImmersive(state) {
  const immersivePages = [LessonsPageNames.SELECTION, LessonsPageNames.SELECTION_ROOT];
  return immersivePages.includes(state.pageName);
}

export {
  className,
  classMemberCount,
  isRecentPage,
  isTopicPage,
  isLearnerPage,
  currentPageIsImmersive,
};
