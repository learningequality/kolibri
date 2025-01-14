import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import { useFacilities } from 'kolibri-common/composables/useFacilities';

export function classIdParamRequiredGuard(toRoute, subtopicName, next) {
  const { setPageLoading } = useFacilities();
  if (!toRoute.params.classId) {
    const { userIsMultiFacilityAdmin } = useUser();
    const redirectPage = get(userIsMultiFacilityAdmin) ? 'AllFacilitiesPage' : 'CoachClassListPage';

    next({
      name: redirectPage,
      params: { subtopicName },
    });
    setPageLoading(false);
    return true;
  }
}

export const RouteSegments = {
  OPTIONAL_CLASS: '/:classId?',
  CLASS: '/:classId',
  LESSON: '/lessons/:lessonId',
  ALL_LESSONS: '/lessons',
  ALL_LESSONS_TEMP: '/lessonstemp',
  LESSONS_TEMP: '/lessonstemp/:lessonId',
  SELECTION: '/selection',
  TOPIC: '/topic/:topicId',
  SEARCH: '/search/:searchTerm',
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
