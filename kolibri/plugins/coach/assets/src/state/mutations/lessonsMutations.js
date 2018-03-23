import { getChannelObject } from 'kolibri.coreVue.vuex.getters';

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

// Including as mutation because used across pages. Might be appropriate for core.
export function SET_TOOLBAR_ROUTE(state, route) {
  state.pageState.toolbarRoute = route;
}

export function SET_ANCESTORS(state, ancestors) {
  state.pageState.ancestors = [...ancestors];
}

export function SET_ANCESTOR_COUNTS(state, ancestorCountsObject) {
  state.pageState.ancestorCounts = ancestorCountsObject;
}

export function SET_WORKING_RESOURCES(state, workingResources) {
  state.pageState.workingResources = [...workingResources];
}
export function ADD_TO_WORKING_RESOURCES(state, contentId) {
  state.pageState.workingResources.push(contentId);
}

export function REMOVE_FROM_WORKING_RESOURCES(state, contentId) {
  state.pageState.workingResources = state.pageState.workingResources.filter(
    resourceId => resourceId !== contentId
  );
}

export function SET_LESSON_REPORT(state, report) {
  state.pageState.lessonReport = { ...report };
}

export function ADD_TO_RESOURCE_CACHE(state, node) {
  if (node && node.pk) {
    const channelObject = getChannelObject(state, node.channel_id);

    state.pageState.resourceCache[node.pk] = {
      ...node,
      channelTitle: channelObject.title,
      id: node.pk,
    };
  }
}

export function SET_LESSONS_MODAL(state, modalName) {
  state.pageState.lessonsModalSet = modalName;
}
