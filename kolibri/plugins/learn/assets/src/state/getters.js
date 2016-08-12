
const constants = require('./constants');


function pageMode(state) {
  const explorePages = [
    constants.PageNames.EXPLORE_ROOT,
    constants.PageNames.EXPLORE_CHANNEL,
    constants.PageNames.EXPLORE_TOPIC,
    constants.PageNames.EXPLORE_CONTENT,
  ];
  const learnPages = [
    constants.PageNames.LEARN_ROOT,
    constants.PageNames.LEARN_CHANNEL,
    constants.PageNames.LEARN_CONTENT,
  ];
  if (explorePages.some(page => page === state.pageName)) {
    return constants.PageModes.EXPLORE;
  } else if (learnPages.some(page => page === state.pageName)) {
    return constants.PageModes.LEARN;
  }
  return undefined;
}

module.exports = {
  pageMode,
};
