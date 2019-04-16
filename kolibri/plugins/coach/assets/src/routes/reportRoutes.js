import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import pages from '../views/reports/allReportsPages';
import {
  generateExerciseDetailHandler,
  exerciseRootRedirectHandler,
} from '../modules/exerciseDetail/handlers';
import { generateExamReportDetailHandler } from '../modules/examReportDetail/handlers';
import {
  generateQuestionDetailHandler,
  questionRootRedirectHandler,
} from '../modules/questionDetail/handlers';
import { generateQuestionListHandler } from '../modules/questionList/handlers';
import LessonEditDetailsPage from '../views/plan/LessonEditDetailsPage';
import QuizEditDetailsPage from '../views/plan/QuizEditDetailsPage';

const ACTIVITY = '/activity';
const CLASS = '/:classId/reports';
const GROUPS = '/groups';
const GROUP = '/groups/:groupId';
const LEARNERS = '/learners';
const LEARNER = '/learners/:learnerId';
const LESSONS = '/lessons';
const LESSON = '/lessons/:lessonId';
const QUIZZES = '/quizzes';
const QUIZ = '/quizzes/:quizId';
const QUESTIONS = '/questions';
const QUESTION = '/questions/:questionId';
const ATTEMPT = '/attempts/:attemptId';
const INTERACTION = '/interactions/:interactionIndex';
const EXERCISE = '/exercises/:exerciseId';
const RESOURCES = '/resources';
const RESOURCE = '/resources/:resourceId';

function path(...args) {
  return args.join('');
}

function defaultHandler() {
  store.dispatch('notLoading');
}

export default [
  {
    name: PageNames.REPORTS_PAGE,
    path: path(CLASS),
    redirect: { name: 'ReportsLessonListPage' },
  },
  {
    path: path(CLASS, GROUP, ACTIVITY),
    component: pages.ReportsGroupActivityPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['activityLabel', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LEARNERS),
    component: pages.ReportsGroupLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['membersLabel', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUPS),
    component: pages.ReportsGroupListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['groupsLabel', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNERS),
    component: pages.ReportsGroupReportLessonExerciseLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNER),
    name: PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return exerciseRootRedirectHandler(
        params,
        pages.ReportsGroupReportLessonExerciseLearnerPage.name,
        next
      );
    },
    meta: {
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNER, ATTEMPT, INTERACTION),
    component: pages.ReportsGroupReportLessonExerciseLearnerPage,
    handler: generateExerciseDetailHandler(['groupId', 'learnerId', 'lessonId', 'exerciseId']),
    meta: {
      // Leaves out attempt and interaction
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, QUESTIONS),
    component: pages.ReportsGroupReportLessonExerciseQuestionListPage,
    handler: generateQuestionListHandler(['groupId', 'lessonId', 'exerciseId']),
    meta: {
      titleParts: ['questionsLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, QUESTION),
    name: PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_QUESTION_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return questionRootRedirectHandler(
        params,
        pages.ReportsGroupReportLessonExerciseQuestionPage.name,
        next
      );
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, QUESTION, LEARNER, INTERACTION),
    component: pages.ReportsGroupReportLessonExerciseQuestionPage,
    handler: generateQuestionDetailHandler(['groupId', 'lessonId', 'exerciseId', 'questionId']),
    meta: {
      // Leaves out info on question
      titleParts: ['questionLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON),
    component: pages.ReportsGroupReportLessonPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, RESOURCE, LEARNERS),
    component: pages.ReportsGroupReportLessonResourceLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'RESOURCE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, '/reports'),
    component: pages.ReportsGroupReportPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['reportsLabel', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, QUIZ, LEARNERS),
    component: pages.ReportsGroupReportQuizLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'QUIZ_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, QUIZ, LEARNER),
    name: PageNames.REPORTS_GROUP_REPORT_QUIZ_LEARNER_PAGE_ROOT,
    redirect: to => {
      const { params } = to;
      return {
        name: pages.ReportsGroupReportQuizLearnerPage.name,
        params: {
          ...params,
          questionId: 0,
          interactionIndex: 0,
        },
      };
    },
  },
  {
    path: path(CLASS, GROUP, QUIZ, LEARNER, QUESTION, INTERACTION),
    component: pages.ReportsGroupReportQuizLearnerPage,
    handler: generateExamReportDetailHandler(['groupId', 'learnerId', 'quizId']),
    meta: {
      titleParts: ['LEARNER_NAME', 'QUIZ_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, QUIZ, QUESTIONS),
    component: pages.ReportsGroupReportQuizQuestionListPage,
    handler: generateQuestionListHandler(['groupId', 'quizId']),
    meta: {
      titleParts: ['questionsLabel', 'QUIZ_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, GROUP, QUIZ, QUESTION),
    name: PageNames.REPORTS_GROUP_REPORT_QUIZ_QUESTION_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return questionRootRedirectHandler(
        params,
        pages.ReportsGroupReportQuizQuestionPage.name,
        next
      );
    },
  },
  {
    path: path(CLASS, GROUP, QUIZ, QUESTION, LEARNER, INTERACTION),
    component: pages.ReportsGroupReportQuizQuestionPage,
    handler: generateQuestionDetailHandler(['groupId', 'quizId', 'questionId']),
    meta: {
      titleParts: ['questionsLabel', 'QUIZ_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY, EXERCISE),
    name: PageNames.REPORTS_LEARNER_ACTIVITY_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return exerciseRootRedirectHandler(
        params,
        pages.ReportsLearnerActivityExercisePage.name,
        next
      );
    },
    meta: {
      titleParts: ['EXERCISE_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLearnerActivityExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'exerciseId']),
    meta: {
      titleParts: ['EXERCISE_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY),
    component: pages.ReportsLearnerActivityPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['activityLabel', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNERS),
    component: pages.ReportsLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, LESSON, EXERCISE),
    name: PageNames.REPORTS_LEARNER_REPORT_LESSON_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return exerciseRootRedirectHandler(
        params,
        pages.ReportsLearnerReportLessonExercisePage.name,
        next
      );
    },
    meta: {
      titleParts: ['EXERCISE_NAME', 'LESSON_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, LESSON, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLearnerReportLessonExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
    meta: {
      titleParts: ['EXERCISE_NAME', 'LESSON_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, LESSON),
    component: pages.ReportsLearnerReportLessonPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['LESSON_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, '/reports'),
    component: pages.ReportsLearnerReportPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['reportsLabel', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LEARNER, QUIZ),
    name: PageNames.REPORTS_LEARNER_REPORT_QUIZ_PAGE_ROOT,
    redirect: to => {
      const { params } = to;
      return {
        name: pages.ReportsLearnerReportQuizPage.name,
        params: {
          ...params,
          questionId: 0,
          interactionIndex: 0,
        },
      };
    },
  },
  {
    path: path(CLASS, LEARNER, QUIZ, QUESTION, INTERACTION),
    component: pages.ReportsLearnerReportQuizPage,
    handler: generateExamReportDetailHandler(['learnerId', 'quizId']),
    meta: {
      titleParts: ['QUIZ_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: 'LessonReportEditDetailsPage',
    path: path(CLASS, LESSON, '/edit'),
    component: LessonEditDetailsPage,
    props: {
      showResourcesTable: true,
    },
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNERS),
    component: pages.ReportsLessonExerciseLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNER),
    name: PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params, query } = to;
      return exerciseRootRedirectHandler(
        params,
        pages.ReportsLessonExerciseLearnerPage.name,
        next,
        query
      );
    },
    meta: {
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNER, ATTEMPT, INTERACTION),
    component: pages.ReportsLessonExerciseLearnerPage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
    meta: {
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, EXERCISE, QUESTIONS),
    component: pages.ReportsLessonExerciseQuestionListPage,
    handler: generateQuestionListHandler(['lessonId', 'exerciseId']),
    meta: {
      titleParts: ['questionsLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, EXERCISE, QUESTION),
    name: PageNames.REPORTS_LESSON_EXERCISE_QUESTION_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return questionRootRedirectHandler(
        params,
        pages.ReportsLessonExerciseQuestionPage.name,
        next
      );
    },
  },
  {
    path: path(CLASS, LESSON, EXERCISE, QUESTION, LEARNER, INTERACTION),
    component: pages.ReportsLessonExerciseQuestionPage,
    handler: generateQuestionDetailHandler(['lessonId', 'exerciseId', 'questionId']),
    meta: {
      // No info on question
      titleParts: ['EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, LEARNER, EXERCISE),
    name: PageNames.REPORTS_LESSON_LEARNER_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return exerciseRootRedirectHandler(params, pages.ReportsLessonLearnerExercisePage.name, next);
    },
    meta: {
      titleParts: ['EXERCISE_NAME', 'LEARNER_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, LEARNER, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLessonLearnerExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
    meta: {
      // Leaves out attempt and interaction numbers
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, LEARNERS),
    component: pages.ReportsLessonLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, LEARNER),
    component: pages.ReportsLessonLearnerPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['LEARNER_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSONS),
    component: pages.ReportsLessonListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['lessonsLabel', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, '/manager'),
    component: pages.ReportsLessonManagerPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['manageResourcesAction', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, RESOURCES),
    component: pages.ReportsLessonReportPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['reportLabel', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, LESSON, RESOURCE, LEARNERS),
    component: pages.ReportsLessonResourceLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['RESOURCE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: 'QuizReportEditDetailsPage',
    path: path(CLASS, QUIZ, '/edit'),
    component: QuizEditDetailsPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, QUIZ, LEARNERS),
    component: pages.ReportsQuizLearnerListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'QUIZ_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, QUIZ, LEARNER),
    name: PageNames.REPORTS_QUIZ_LEARNER_PAGE_ROOT,
    redirect: to => {
      const { params } = to;
      return {
        name: pages.ReportsQuizLearnerPage.name,
        params: {
          ...params,
          questionId: 0,
          interactionIndex: 0,
        },
      };
    },
  },
  {
    path: path(CLASS, QUIZ, LEARNER, QUESTION, INTERACTION),
    component: pages.ReportsQuizLearnerPage,
    handler: generateExamReportDetailHandler(['learnerId', 'quizId']),
    meta: {
      // Leaves out question and interaction numbers
      titleParts: ['LEARNER_NAME', 'QUIZ_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, QUIZZES),
    component: pages.ReportsQuizListPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    name: pages.ReportsQuizPreviewPage.name,
    path: path(CLASS, QUIZ, '/preview'),
    component: pages.ReportsQuizPreviewPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['previewLabel', 'QUIZ_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, QUIZ, QUESTIONS),
    component: pages.ReportsQuizQuestionListPage,
    handler: generateQuestionListHandler(['quizId']),
    meta: {
      titleParts: ['questionsLabel', 'QUIZ_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: path(CLASS, QUIZ, QUESTION),
    name: PageNames.REPORTS_QUIZ_QUESTION_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return questionRootRedirectHandler(params, pages.ReportsQuizQuestionPage.name, next);
    },
  },
  {
    path: path(CLASS, QUIZ, QUESTION, LEARNER, INTERACTION),
    component: pages.ReportsQuizQuestionPage,
    handler: generateQuestionDetailHandler(['quizId', 'questionId']),
    meta: {
      // TODO Leaves out details about the question
      titleParts: ['QUIZ_NAME', 'CLASS_NAME'],
    },
  },
];
