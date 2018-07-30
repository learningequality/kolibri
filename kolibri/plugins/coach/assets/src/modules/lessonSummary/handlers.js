import { LearnerGroupResource } from 'kolibri.resources';
import { LessonsPageNames } from '../../constants/lessonsConstants';
import LessonReportResource from '../../apiResources/lessonReport';

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
      LessonReportResource.fetchModel({ id: lessonId, force: true }),
      store.dispatch('setClassState', classId),
    ];

    Promise.all(loadRequirements)
      .then(([currentLesson, learnerGroups, lessonReport]) => {
        // TODO state mapper
        const resourceIds = currentLesson.resources.map(resourceObj => resourceObj.contentnode_id);

        return store.dispatch('lessonSummary/getResourceCache', resourceIds).then(() => {
          store.commit('lessonSummary/SET_WORKING_RESOURCES', resourceIds);
          store.commit('lessonSummary/SET_LEARNER_GROUPS', learnerGroups);
          store.commit('lessonSummary/SET_LESSON_REPORT', lessonReport);
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
