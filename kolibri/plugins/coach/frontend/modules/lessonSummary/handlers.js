import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { PageNames } from '../../constants';

export async function setLessonSummaryState(store, params) {
  const { getFacilities, facilities } = useFacilities();
  const { classId, lessonId } = params;
  store.commit('lessonSummary/resources/RESET_STATE');
  store.commit('lessonSummary/SET_STATE', {
    currentLesson: {},
    lessonReport: {},
    workingResources: [],
    resourceCache: store.state.lessonSummary.resourceCache || {},
    lessonsModalSet: null,
  });
  const initClassInfoPromise = store.dispatch('initClassInfo', classId);
  const { isSuperuser } = useUser();
  const getFacilitiesPromise =
    get(isSuperuser) && get(facilities).length === 0
      ? getFacilities().catch(() => {})
      : Promise.resolve();

  await Promise.all([initClassInfoPromise, getFacilitiesPromise]);

  const loadRequirements = [
    store.dispatch('lessonSummary/updateCurrentLesson', lessonId),
    LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
    // Need state.classList to be set for copying to work
    store.dispatch('setClassList', store.state.classSummary.facility_id),
  ];

  return Promise.all(loadRequirements)
    .then(([currentLesson, learnerGroups]) => {
      // TODO state mapper
      const resourceIds = currentLesson.resources.map(resourceObj => resourceObj.contentnode_id);

      return store.dispatch('lessonSummary/getResourceCache', resourceIds).then(() => {
        store.commit('lessonSummary/SET_WORKING_RESOURCES', currentLesson.resources);
        store.commit('lessonSummary/SET_LEARNER_GROUPS', learnerGroups);
        store.commit('SET_PAGE_NAME', PageNames.LESSON_SUMMARY);
      });
    })
    .catch(error => {
      return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
    });
}

export function showLessonSummaryPage(store, params) {
  return store.dispatch('loading').then(() => {
    setLessonSummaryState(store, params).then(() => {
      store.dispatch('notLoading');
    });
  });
}
