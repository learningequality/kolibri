import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import pages from '../views/reports/allReportsPages';

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
    component: pages.ReportsGroupLearnerReportQuizPage,
    handler: defaultHandler,
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
    component: pages.ReportsGroupReportLessonExerciseLearnerPage,
    handler: defaultHandler,
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
    component: pages.ReportsGroupReportQuizLearnerPage,
    handler: defaultHandler,
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
    component: pages.ReportsLearnerActivityExercisePage,
    handler: defaultHandler,
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
    component: pages.ReportsLearnerReportLessonExercisePage,
    handler: defaultHandler,
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
    component: pages.ReportsLearnerReportQuizPage,
    handler: defaultHandler,
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
    component: pages.ReportsLessonExerciseLearnerPage,
    handler: defaultHandler,
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
    component: pages.ReportsLessonLearnerExercisePage,
    handler: defaultHandler,
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
    component: pages.ReportsQuizLearnerPage,
    handler: defaultHandler,
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
