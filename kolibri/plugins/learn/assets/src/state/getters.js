
import * as constants from '../constants';


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
  const examPages = [
    constants.PageNames.EXAM_LIST,
    constants.PageNames.EXAM,
  ];
  if (explorePages.some(page => page === state.pageName)) {
    return constants.PageModes.EXPLORE;
  } else if (learnPages.some(page => page === state.pageName)) {
    return constants.PageModes.LEARN;
  } else if (constants.PageNames.SEARCH === state.pageName) {
    return constants.PageModes.SEARCH;
  } else if (examPages.some(page => page === state.pageName)) {
    return constants.PageModes.EXAM;
  }
  return undefined;
}


export {
  pageMode,
};
