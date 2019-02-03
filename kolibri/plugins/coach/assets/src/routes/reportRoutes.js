import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import pages from '../views/reports/allReportsPages';
import {
  generateExerciseDetailHandler,
  rootRedirectHandler,
} from '../modules/exerciseDetail/handlers';
import { generateExamReportDetailHandler } from '../modules/examReportDetail/handlers';

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
  },
  {
    path: path(CLASS, GROUP, LEARNER, ACTIVITY),
    component: pages.ReportsGroupLearnerActivityPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LEARNERS),
    component: pages.ReportsGroupLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LEARNER, LESSON, EXERCISE),
    component: pages.ReportsGroupLearnerReportLessonExercisePage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LEARNER, LESSON),
    component: pages.ReportsGroupLearnerReportLessonPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LEARNER),
    component: pages.ReportsGroupLearnerReportPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LEARNER, QUIZ),
    name: PageNames.REPORTS_GROUP_LEARNER_REPORT_QUIZ_PAGE_ROOT,
    redirect: to => {
      const { params } = to;
      return {
        name: pages.ReportsGroupLearnerReportQuizPage.name,
        params: {
          ...params,
          questionId: 0,
          interactionIndex: 0,
        },
      };
    },
  },
  {
    path: path(CLASS, GROUP, LEARNER, QUIZ, QUESTION, INTERACTION),
    component: pages.ReportsGroupLearnerReportQuizPage,
    handler: generateExamReportDetailHandler(['groupId', 'learnerId', 'quizId']),
  },
  {
    path: path(CLASS, GROUPS),
    component: pages.ReportsGroupListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNERS),
    component: pages.ReportsGroupReportLessonExerciseLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNER),
    name: PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return rootRedirectHandler(params, pages.ReportsLessonExerciseLearnerPage.name, next);
    },
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNER, ATTEMPT, INTERACTION),
    component: pages.ReportsGroupReportLessonExerciseLearnerPage,
    handler: generateExerciseDetailHandler(['groupId', 'learnerId', 'lessonId', 'exerciseId']),
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, QUESTIONS),
    component: pages.ReportsGroupReportLessonExerciseQuestionListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, QUESTION),
    component: pages.ReportsGroupReportLessonExerciseQuestionPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LESSON),
    component: pages.ReportsGroupReportLessonPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, LESSON, RESOURCE, LEARNERS),
    component: pages.ReportsGroupReportLessonResourceLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP),
    component: pages.ReportsGroupReportPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, QUIZ, LEARNERS),
    component: pages.ReportsGroupReportQuizLearnerListPage,
    handler: defaultHandler,
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
  },
  {
    path: path(CLASS, GROUP, QUIZ, QUESTIONS),
    component: pages.ReportsGroupReportQuizQuestionListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, GROUP, QUIZ, QUESTIONS),
    component: pages.ReportsGroupReportQuizQuestionPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY, EXERCISE),
    name: PageNames.REPORTS_LEARNER_ACTIVITY_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return rootRedirectHandler(params, pages.ReportsLearnerActivityExercisePage.name, next);
    },
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLearnerActivityExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'exerciseId']),
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY),
    component: pages.ReportsLearnerActivityPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LEARNERS),
    component: pages.ReportsLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LEARNER, LESSON, EXERCISE),
    name: PageNames.REPORTS_LEARNER_REPORT_LESSON_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return rootRedirectHandler(params, pages.ReportsLearnerReportLessonExercisePage.name, next);
    },
  },
  {
    path: path(CLASS, LEARNER, LESSON, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLearnerReportLessonExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
  },
  {
    path: path(CLASS, LEARNER, LESSON),
    component: pages.ReportsLearnerReportLessonPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LEARNER),
    component: pages.ReportsLearnerReportPage,
    handler: defaultHandler,
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
  },
  {
    path: path(CLASS, LESSON, '/edit'),
    component: pages.ReportsLessonEditorPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNERS),
    component: pages.ReportsLessonExerciseLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNER),
    name: PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return rootRedirectHandler(params, pages.ReportsLessonExerciseLearnerPage.name, next);
    },
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNER, ATTEMPT, INTERACTION),
    component: pages.ReportsLessonExerciseLearnerPage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
  },
  {
    path: path(CLASS, LESSON, EXERCISE, QUESTIONS),
    component: pages.ReportsLessonExerciseQuestionListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, EXERCISE, QUESTION),
    component: pages.ReportsLessonExerciseQuestionPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, LEARNER, EXERCISE),
    name: PageNames.REPORTS_LESSON_LEARNER_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return rootRedirectHandler(params, pages.ReportsLessonLearnerExercisePage.name, next);
    },
  },
  {
    path: path(CLASS, LESSON, LEARNER, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLessonLearnerExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
  },
  {
    path: path(CLASS, LESSON, LEARNERS),
    component: pages.ReportsLessonLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, LEARNER),
    component: pages.ReportsLessonLearnerPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSONS),
    component: pages.ReportsLessonListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, '/manager'),
    component: pages.ReportsLessonManagerPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, RESOURCES),
    component: pages.ReportsLessonReportPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, LESSON, RESOURCE, LEARNERS),
    component: pages.ReportsLessonResourceLearnerListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, QUIZ, '/edit'),
    component: pages.ReportsQuizEditorPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, QUIZ, LEARNERS),
    component: pages.ReportsQuizLearnerListPage,
    handler: defaultHandler,
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
  },
  {
    path: path(CLASS, QUIZZES),
    component: pages.ReportsQuizListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, QUIZ, '/preview'),
    component: pages.ReportsQuizPreviewPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, QUIZ, QUESTIONS),
    component: pages.ReportsQuizQuestionListPage,
    handler: defaultHandler,
  },
  {
    path: path(CLASS, QUIZ, QUESTION),
    component: pages.ReportsQuizQuestionPage,
    handler: defaultHandler,
  },
];
