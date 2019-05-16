import { LearnerGroupResource } from 'kolibri.resources';
import { LessonsPageNames } from '../../constants/lessonsConstants';

export function setLessonSummaryState(store, params) {
  const { classId, lessonId } = params;
  store.commit('lessonSummary/resources/RESET_STATE');
  store.commit('lessonSummary/SET_STATE', {
    currentLesson: {},
    lessonReport: {},
    workingResources: [],
    resourceCache: store.state.lessonSummary.resourceCache || {},
    lessonsModalSet: null,
  });

  const loadRequirements = [
    store.dispatch('lessonSummary/updateCurrentLesson', lessonId),
    LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
    // Need state.classList to be set for copying to work
    store.dispatch('setClassList'),
  ];

  return Promise.all(loadRequirements)
    .then(([currentLesson, learnerGroups]) => {
      // TODO state mapper
      const resourceIds = currentLesson.resources.map(resourceObj => resourceObj.contentnode_id);

      return store.dispatch('lessonSummary/getResourceCache', resourceIds).then(() => {
        store.commit('lessonSummary/SET_WORKING_RESOURCES', resourceIds);
        store.commit('lessonSummary/SET_LEARNER_GROUPS', learnerGroups);
        store.commit('SET_PAGE_NAME', LessonsPageNames.SUMMARY);
      });
    })
    .catch(error => {
      return store.dispatch('handleApiError', error);
    });
}

export function showLessonSummaryPage(store, params) {
  return store.dispatch('loading').then(() => {
    setLessonSummaryState(store, params).then(() => {
      store.dispatch('notLoading');
    });
  });
}
