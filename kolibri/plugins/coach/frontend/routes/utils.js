import store from 'kolibri/store';
import useFacilities from 'kolibri-common/composables/useFacilities';

export function classIdParamRequiredGuard(toRoute, subtopicName, next) {
  if (!toRoute.params.classId) {
    const { userIsMultiFacilityAdmin } = useFacilities();
    const redirectPage = userIsMultiFacilityAdmin.value
      ? 'AllFacilitiesPage'
      : 'CoachClassListPage';

    next({
      name: redirectPage,
      params: { subtopicName },
    });
    store.commit('CORE_SET_PAGE_LOADING', false);
    return true;
  }
}

export const RouteSegments = {
  OPTIONAL_CLASS: '/:classId?',
  CLASS: '/:classId',
  LESSON: '/lessons/:lessonId',
  ALL_LESSONS: '/lessons',
  PREVIEW: '/preview/:contentId',
  RESOURCE: '/resources/:resourceId',
  ALL_LEARNERS: '/learners',
  LEARNER: '/learners/:learnerId',
  EXERCISE: '/exercises/:exerciseId',
  QUESTIONS: '/questions',
  QUESTION: '/questions/:questionId',
  TRY: '/try/:tryIndex',
  INTERACTION: '/interactions/:interactionIndex',
  OPTIONAL_GROUP: '/groups/:groupId?',
  ALL_GROUPS: '/groups',
  GROUP: '/groups/:groupId',
  QUIZ: '/quizzes/:quizId',
  ALL_QUIZZES: '/quizzes',
};
