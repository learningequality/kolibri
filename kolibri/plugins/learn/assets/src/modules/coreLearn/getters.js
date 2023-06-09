import { PageNames, PageModes } from '../../constants';

export function pageMode(state) {
  const topicsPages = [
    PageNames.TOPICS_TOPIC,
    PageNames.TOPICS_TOPIC_SEARCH,
    PageNames.TOPICS_CONTENT,
  ];
  const examPages = [PageNames.EXAM_LIST, PageNames.EXAM];
  if (topicsPages.includes(state.pageName)) {
    return PageModes.TOPICS;
  } else if (PageNames.LIBRARY === state.pageName) {
    return PageModes.LIBRARY;
  } else if (PageNames.SEARCH === state.pageName) {
    return PageModes.SEARCH;
  } else if (examPages.includes(state.pageName)) {
    return PageModes.EXAM;
  }
  return undefined;
}

export function canAccessUnassignedContent(state, getters) {
  return (
    state.canAccessUnassignedContentSetting ||
    getters.isCoach ||
    getters.isAdmin ||
    getters.isSuperUser
  );
}

export function allowGuestAccess(state) {
  return state.allowGuestAccess;
}

export function getRootNodesLoading(state) {
  return state.rootNodesLoading;
}
