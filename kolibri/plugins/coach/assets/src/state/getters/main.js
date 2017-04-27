const Constants = require('../../constants');


function className(state) {
  const cls = state.classList.find(thisClass => thisClass.id === state.classId);
  if (cls) {
    return cls.name;
  }
  return '';
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


module.exports = {
  className,
  isRecentPage,
  isTopicPage,
  isLearnerPage,
};
