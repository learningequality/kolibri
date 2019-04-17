import { LessonResource, ContentNodeSlimResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { error as logError } from 'kolibri.lib.logging';
import router from 'kolibri.coreVue.router';
import { LessonsPageNames } from '../../constants/lessonsConstants';

const translator = createTranslator('LessonSummaryActionsTexts', {
  lessonIsNowActive: 'Lesson is now active',
  lessonIsNowInactive: 'Lesson is now inactive',
  lessonDeleted: 'Lesson deleted',
  copiedLessonTo: `Copied lesson to '{classroomName}'`,
  changesToLessonSaved: 'Changes to lesson saved',
});

function showSnackbar(store, string) {
  return store.dispatch('createSnackbar', string, { root: true });
}

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
  return LessonResource.fetchModel({
    id: lessonId,
  }).then(
    lesson => {
      store.commit('SET_CURRENT_LESSON', lesson);
      return lesson;
    },
    error => {
      return store.dispatch('handleApiError', error, { root: true });
    }
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
    return ContentNodeSlimResource.fetchCollection({
      getParams: {
        ids: nonCachedResourceIds,
        include_fields: ['num_coach_contents'],
      },
    }).then(contentNodes => {
      contentNodes.forEach(contentNode =>
        store.commit('ADD_TO_RESOURCE_CACHE', {
          node: contentNode,
          channelTitle: store.getters.getChannelForNode(contentNode).title,
        })
      );
      return { ...resourceCache };
    });
  } else {
    return Promise.resolve({ ...resourceCache });
  }
}

export function saveLessonResources(store, { lessonId, resourceIds }) {
  return store.dispatch('getResourceCache', resourceIds).then(resourceCache => {
    const resources = resourceIds.map(resourceId => {
      const node = resourceCache[resourceId];
      return {
        contentnode_id: resourceId,
        channel_id: node.channel_id,
        content_id: node.content_id,
      };
    });

    return LessonResource.saveModel({
      id: lessonId,
      data: { resources },
    }).then(lesson => {
      // Update the class summary now that there is a change to a lesson
      return store.dispatch('classSummary/refreshClassSummary', null, { root: true }).then(() => {
        return lesson;
      });
    });
  });
}

export function deleteLesson(store, { lessonId, classId }) {
  LessonResource.deleteModel({ id: lessonId })
    .then(() => {
      router.replace({
        name: LessonsPageNames.PLAN_LESSONS_ROOT,
        params: {
          classId,
          lessonId,
        },
      });
      showSnackbar(store, translator.$tr('lessonDeleted'));
    })
    .catch(error => {
      // TODO handle error inside the current page
      store.dispatch('handleApiError', error, { root: true });
      logError(error);
    });
}

export function copyLesson(store, payload) {
  return LessonResource.saveModel({ data: payload });
}
