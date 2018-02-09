export function SET_CLASS_LESSONS(state, lessons) {
  state.pageState.lessons = [...lessons];
}

export function SET_CURRENT_LESSON(state, lesson) {
  state.pageState.currentLesson = { ...lesson };
}

export function SET_LEARNER_GROUPS(state, learnerGroups) {
  state.pageState.learnerGroups = [...learnerGroups];
}

export function SET_RESOURCE_CONTENT_NODES(state, resourceContentNodes) {
  state.pageState.resourceContentNodes = resourceContentNodes;
}

export function SET_CONTENT_LIST(state, contentList) {
  state.pageState.contentList = [...contentList];
}

export function SET_ANCESTORS(state, ancestors) {
  state.pageState.ancestors = [...ancestors];
}

export function ADD_TO_SELECTED_RESOURCES(state, contentId) {
  state.pageState.selectedResources.push(contentId);
}

export function REMOVE_FROM_SELECTED_RESOURCES(state, contentId) {
  state.pageState.selectedResources = state.pageState.selectedResources.filter(
    resourceId => resourceId !== contentId
  );
}
