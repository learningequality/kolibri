import LessonResource from 'kolibri-common/apiResources/LessonResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';

export function resetLessonSummaryState(store) {
  store.commit('RESET_STATE');
  store.commit('resources/RESET_STATE');
}

export function addToResourceCache(store, { node }) {
  store.commit('ADD_TO_RESOURCE_CACHE', {
    node,
    channelTitle: store.getters.getChannelForNode(node).title || '',
  });
}

export function updateCurrentLesson(store, lessonId) {
  return Promise.all([
    LessonResource.fetchModel({
      id: lessonId,
    }),
    LessonResource.fetchLessonsSizes({ id: lessonId }),
  ]).then(
    ([lesson, lessonSizes]) => {
      const size = lessonSizes[0] && lessonSizes[0][lessonId];
      lesson.size = size;
      store.commit('SET_CURRENT_LESSON', lesson);
      return lesson;
    },
    error => {
      return store.dispatch('handleApiError', { error }, { root: true });
    },
  );
}

export function getResourceCache(store, resourceIds) {
  // duplicate data to remove reliance on state throughout the entire method
  const { resourceCache } = Object.assign({}, store.state);
  const nonCachedResourceIds = [];

  if (resourceCache) {
    resourceIds.forEach(id => {
      if (!resourceCache[id]) {
        nonCachedResourceIds.push(id);
      }
    });
  }

  if (nonCachedResourceIds.length) {
    return ContentNodeResource.fetchCollection({
      getParams: {
        ids: nonCachedResourceIds,
        no_available_filtering: true,
      },
    }).then(contentNodes => {
      contentNodes.forEach(contentNode => {
        const channel = store.getters.getChannelForNode(contentNode);
        store.commit('ADD_TO_RESOURCE_CACHE', {
          node: contentNode,
          channelTitle: channel ? channel.title : '',
        });
      });
      return { ...resourceCache };
    });
  } else {
    return Promise.resolve({ ...resourceCache });
  }
}

export function saveLessonResources(store, { lessonId, resources }) {
  return LessonResource.saveModel({
    id: lessonId,
    data: { resources },
  }).then(lesson => {
    // Update the class summary now that there is a change to a lesson
    return store.dispatch('classSummary/refreshClassSummary', null, { root: true }).then(() => {
      return lesson;
    });
  });
}
