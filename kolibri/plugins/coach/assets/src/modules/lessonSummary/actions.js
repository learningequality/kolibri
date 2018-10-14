import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { LessonResource, ContentNodeSlimResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { error as logError } from 'kolibri.lib.logging';
import router from 'kolibri.coreVue.router';
import { LessonsPageNames } from '../../constants/lessonsConstants';
import LessonReportResource from '../../apiResources/lessonReport';

const translator = createTranslator('LessonSummaryActionsTexts', {
  lessonIsNowActive: 'Lesson is now active',
  lessonIsNowInactive: 'Lesson is now inactive',
  lessonDeleted: 'Lesson deleted',
  copiedLessonTo: `Copied lesson to '{classroomName}'`,
  changesToLessonSaved: 'Changes to lesson saved',
});

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

export function setLessonsModal(store, modalName) {
  store.commit('SET_LESSONS_MODAL', modalName);
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
    });
  });
}

export function updateLessonStatus(store, { lessonId, isActive }) {
  LessonResource.saveModel({
    id: lessonId,
    data: {
      is_active: isActive,
    },
  })
    .then(lesson => {
      store.commit('SET_CURRENT_LESSON', lesson);
      store.dispatch('setLessonsModal', null);
      store.dispatch(
        'createSnackbar',
        {
          text: isActive
            ? translator.$tr('lessonIsNowActive')
            : translator.$tr('lessonIsNowInactive'),
          autoDismiss: true,
        },
        { root: true }
      );
    })
    .catch(err => {
      // TODO handle error properly
      store.dispatch('handleApiError', err, { root: true });
      logError(err);
    });
}

export function deleteLesson(store, { lessonId, classId }) {
  LessonResource.deleteModel({ id: lessonId })
    .then(() => {
      router.replace({
        name: LessonsPageNames.ROOT,
        params: {
          classId,
          lessonId,
        },
      });
      store.dispatch(
        'createSnackbar',
        {
          text: translator.$tr('lessonDeleted'),
          autoDismiss: true,
        },
        { root: true }
      );
    })
    .catch(error => {
      // TODO handle error inside the current page
      store.dispatch('handleApiError', error, { root: true });
      logError(error);
    });
}

export function copyLesson(store, { payload, classroomName }) {
  LessonResource.saveModel({ data: payload })
    .then(() => {
      store.dispatch('setLessonsModal', null);
      store.dispatch(
        'createSnackbar',
        {
          text: translator.$tr('copiedLessonTo', { classroomName }),
          autoDismiss: true,
        },
        { root: true }
      );
    })
    .catch(error => {
      store.dispatch('handleApiError', error, { root: true });
      logError(error);
    });
}

export function updateLesson(store, { lessonId, payload }) {
  return new Promise((resolve, reject) => {
    LessonResource.saveModel({
      id: lessonId,
      data: payload,
    })
      .then(() => {
        store.dispatch('setLessonsModal', null);
        store.dispatch(
          'createSnackbar',
          {
            text: translator.$tr('changesToLessonSaved'),
            autoDismiss: true,
          },
          { root: true }
        );
        store.dispatch('updateCurrentLesson', lessonId);
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
}

export function setLessonReportTableData(store, params) {
  const { lessonId } = params;
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  return LessonReportResource.fetchModel({ id: lessonId, force: true }).then(lessonReport => {
    if (isSamePage()) {
      store.commit('SET_LESSON_REPORT', lessonReport);
    }
  });
}
