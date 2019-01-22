import { LearnerGroupResource } from 'kolibri.resources';
import { LessonsPageNames } from '../../constants/lessonsConstants';

export function showLessonSummaryPage(store, params) {
  const { classId, lessonId } = params;
  return store.dispatch('loading').then(() => {
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
      store.dispatch('lessonSummary/setLessonReportTableData', { lessonId }),
      store.dispatch('classSummary/loadClassSummary', classId),
    ];

    Promise.all(loadRequirements)
      .then(([currentLesson, learnerGroups]) => {
        // TODO state mapper
        const resourceIds = currentLesson.resources.map(resourceObj => resourceObj.contentnode_id);

        return store.dispatch('lessonSummary/getResourceCache', resourceIds).then(() => {
          store.commit('lessonSummary/SET_WORKING_RESOURCES', resourceIds);
          store.commit('lessonSummary/SET_LEARNER_GROUPS', learnerGroups);
          store.commit('SET_PAGE_NAME', LessonsPageNames.SUMMARY);
          store.dispatch('notLoading');
        });
      })
      .catch(error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', error);
      });
  });
}
