import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import pages from '../views/reports/allReportsPages';
import { showExerciseDetailView, rootRedirectHandler } from '../modules/exerciseDetail/handlers';
import { setLessonSummaryState } from '../modules/lessonSummary/handlers';

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

function activityExerciseDetailRootRedirectHandler(to, from, next) {
  const { params } = to;
  return rootRedirectHandler(params, pages.ReportsGroupReportLessonExerciseLearnerPage.name, next);
}

function activityExerciseDetailHandler(to, from) {
  const { params } = to;
  const fromParams = from.params;
  let setLoading =
    params.learnerId !== fromParams.learnerId || params.exerciseId !== fromParams.exerciseId;
  if (setLoading) {
    // Only set loading state if we are not switching between
    // different views of the same learner's exercise report.
    store.dispatch('loading');
  }
  showExerciseDetailView(params).then(() => {
    // Set not loading regardless, as we are now
    // ready to render.
    store.dispatch('notLoading');
  });
}

function lessonExerciseDetailRootRedirectHandler(to, from, next) {
  const { params } = to;
  return rootRedirectHandler(params, pages.ReportsLessonExerciseLearnerPage.name, next);
}

function lessonExerciseDetailHandler(to, from) {
  const { params } = to;
  const fromParams = from.params;
  const loadLesson = store.state.lessonSummary.currentLesson.id !== params.lessonId;
  let setLoading =
    loadLesson ||
    params.learnerId !== fromParams.learnerId ||
    params.exerciseId !== fromParams.exerciseId;
  if (setLoading) {
    // Only set loading state if we are not switching between
    // different views of the same learner's exercise report.
    store.dispatch('loading');
  }
  const promises = [];
  if (loadLesson) {
    promises.push(setLessonSummaryState(store, params));
  }
  promises.push(showExerciseDetailView(params));
  Promise.all(promises).then(() => {
    // Set not loading regardless, as we are now
    // ready to render.
    store.dispatch('notLoading');
  });
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
    component: PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    handler: lessonExerciseDetailRootRedirectHandler,
  },
  {
    path: path(CLASS, GROUP, LESSON, EXERCISE, LEARNER, ATTEMPT, INTERACTION),
    component: pages.ReportsGroupReportLessonExerciseLearnerPage,
    handler: lessonExerciseDetailHandler,
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
    component: PageNames.REPORTS_LEARNER_ACTIVITY_EXERCISE_PAGE_ROOT,
    handler: activityExerciseDetailRootRedirectHandler,
  },
  {
    path: path(CLASS, LEARNER, ACTIVITY, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLearnerActivityExercisePage,
    handler: activityExerciseDetailHandler,
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
    component: PageNames.REPORTS_LEARNER_REPORT_LESSON_EXERCISE_PAGE_ROOT,
    handler: lessonExerciseDetailRootRedirectHandler,
  },
  {
    path: path(CLASS, LEARNER, LESSON, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLearnerReportLessonExercisePage,
    handler: lessonExerciseDetailHandler,
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
    name: PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    beforeEnter: lessonExerciseDetailRootRedirectHandler,
  },
  {
    path: path(CLASS, LESSON, EXERCISE, LEARNER, ATTEMPT, INTERACTION),
    component: pages.ReportsLessonExerciseLearnerPage,
    handler: lessonExerciseDetailHandler,
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
    component: PageNames.REPORTS_LESSON_LEARNER_EXERCISE_PAGE_ROOT,
    handler: lessonExerciseDetailRootRedirectHandler,
  },
  {
    path: path(CLASS, LESSON, LEARNER, EXERCISE, ATTEMPT, INTERACTION),
    component: pages.ReportsLessonLearnerExercisePage,
    handler: lessonExerciseDetailHandler,
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
