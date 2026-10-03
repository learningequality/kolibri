import useFacilities from 'kolibri-common/composables/useFacilities';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { PageNames } from '../constants';

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
    pageLoading.value = false;
    return true;
  }
}

export function staysOnPage(to, from) {
  return (
    to.name === from.name &&
    Boolean(
      (to.params.quizId && from.params.quizId) ||
      (to.params.exerciseId && from.params.exerciseId && to.meta.keepFocus) ||
      (to.name === PageNames.GROUP_LESSON_SUMMARY && to.params.lessonId === from.params.lessonId),
    )
  );
}

/** Matches a compact (no-dash) UUID: exactly 32 lowercase hex characters. */
export const COMPACT_UUID_PATTERN = '[0-9a-f]{32}';

export const RouteSegments = {
  OPTIONAL_CLASS: '/:classId?',
  CLASS: `/:classId(${COMPACT_UUID_PATTERN})`,
  LESSON: '/lessons/:lessonId',
  ALL_LESSONS: '/lessons',
  PREVIEW: '/preview/:contentId',
  RESOURCE: '/resources/:resourceId',
  ALL_LEARNERS: '/learners',
  LEARNER: `/learners/:learnerId(${COMPACT_UUID_PATTERN})`,
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
  ALL_COURSES: '/courses',
  COURSE_SESSION: `/courses/:courseSessionId(${COMPACT_UUID_PATTERN})`,
};
