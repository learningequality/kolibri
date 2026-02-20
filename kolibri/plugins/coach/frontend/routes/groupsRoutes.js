import store from 'kolibri/store';
import { PageNames } from '../constants';
import { useGroups } from '../composables/useGroups';
import GroupsRootPage from '../views/groups/GroupsRootPage';
import GroupEnrollPage from '../views/groups/GroupEnrollPage';
import GroupMembersPage from '../views/groups/GroupMembersPage';
import LessonSummaryPage from '../views/lessons/LessonSummaryPage';
import LessonLearnerPage from '../views/lessons/reports/LessonLearnerPage.vue';
import ExerciseQuestionListPage from '../views/common/reports/ExerciseQuestionListPage.vue';
import { generateQuestionListHandler } from '../modules/questionList/handlers';
import GroupLessonExerciseLearnersPage from '../views/groups/reports/GroupLessonExerciseLearnersPage.vue';
import { showLessonSummaryPage } from '../modules/lessonSummary/handlers';
import { generateResourceHandler } from '../modules/resourceDetail/handlers';
import QuizSummaryPage from '../views/quizzes/QuizSummaryPage';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const {
  CLASS,
  OPTIONAL_CLASS,
  ALL_GROUPS,
  GROUP,
  LESSON,
  LEARNER,
  ALL_LEARNERS,
  QUESTIONS,
  EXERCISE,
  QUIZ,
} = RouteSegments;

const { showGroupsPage } = useGroups();

function defaultHandler() {
  store.dispatch('notLoading');
}

export default [
  {
    name: PageNames.GROUPS_ROOT,
    path: OPTIONAL_CLASS + ALL_GROUPS,
    component: GroupsRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.GROUPS_ROOT, next)) {
        return;
      }
      showGroupsPage(store, toRoute.params.classId);
    },
    meta: {
      titleParts: ['groupsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_SUMMARY,
    path: CLASS + GROUP,
    component: GroupMembersPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
    meta: {
      titleParts: ['membersLabel', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_ENROLL,
    path: CLASS + GROUP + '/enroll',
    component: GroupEnrollPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
  },
  {
    name: PageNames.GROUP_LESSON_SUMMARY,
    path: CLASS + GROUP + LESSON + '/:tabId?',
    component: LessonSummaryPage,
    handler(toRoute, fromRoute) {
      if (
        fromRoute.name !== PageNames.GROUP_LESSON_SUMMARY ||
        toRoute.params.lessonId !== fromRoute.params.lessonId
      ) {
        return showLessonSummaryPage(store, toRoute.params);
      }
      store.dispatch('notLoading');
    },
    props: {
      editable: false,
    },
    meta: {
      titleParts: ['LESSON_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_LESSON_LEARNER,
    path: CLASS + GROUP + LESSON + LEARNER,
    component: LessonLearnerPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_LESSON_EXERCISE_LEARNER_REPORT,
    path: CLASS + GROUP + LESSON + EXERCISE + ALL_LEARNERS,
    component: GroupLessonExerciseLearnersPage,
    handler: generateResourceHandler(['exerciseId']),
    meta: {
      titleParts: ['learnersLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_LESSON_EXERCISE_QUESTIONS_REPORT,
    path: CLASS + GROUP + LESSON + EXERCISE + QUESTIONS,
    component: ExerciseQuestionListPage,
    handler: generateQuestionListHandler(['groupId', 'lessonId', 'exerciseId']),
    meta: {
      titleParts: ['questionsLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_EXAM_SUMMARY,
    path: CLASS + GROUP + QUIZ + '/:tabId?',
    component: QuizSummaryPage,
    meta: {
      titleParts: ['QUIZ_NAME', 'quizzesLabel', 'CLASS_NAME'],
    },
  },
];
