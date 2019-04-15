import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import {
  showExamCreationRootPage,
  showExamCreationTopicPage,
  showExamCreationSearchPage,
  showExamCreationQuestionSelectionPage,
  showExamCreationPreviewPage,
} from '../modules/examCreation/handlers';
import CreateExamPage from '../views/plan/CreateExamPage';
import CreateExamPreview from '../views/plan/CreateExamPage/CreateExamPreview.vue';
import PlanQuizPreviewPage from '../views/plan/PlanQuizPreviewPage';
import CoachExamsPage from '../views/plan/CoachExamsPage';
import { showExamsPage } from '../modules/examsRoot/handlers';
import QuizSummaryPage from '../views/plan/QuizSummaryPage';
import QuizEditDetailsPage from '../views/plan/QuizEditDetailsPage';

export default [
  {
    name: PageNames.EXAMS,
    path: '/:classId/plan/quizzes',
    component: CoachExamsPage,
    handler(toRoute) {
      showExamsPage(store, toRoute.params.classId);
    },
    meta: {
      titleParts: ['quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.EXAM_CREATION_ROOT,
    path: '/:classId/plan/quizzes/new/',
    component: CreateExamPage,
    handler: toRoute => {
      showExamCreationRootPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_TOPIC,
    path: '/:classId/plan/quizzes/new/topic/:topicId',
    component: CreateExamPage,
    handler: toRoute => {
      showExamCreationTopicPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_SEARCH,
    path: '/:classId/plan/quizzes/new/search/:searchTerm',
    component: CreateExamPage,
    handler: toRoute => {
      showExamCreationSearchPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: PageNames.EXAM_CREATION_QUESTION_SELECTION,
    path: '/:classId/plan/quizzes/new/finalize',
    component: CreateExamPreview,
    handler: (toRoute, fromRoute) => {
      showExamCreationQuestionSelectionPage(store, toRoute, fromRoute);
    },
  },
  {
    name: PageNames.EXAM_CREATION_PREVIEW,
    path: '/:classId/plan/quizzes/new/preview/',
    component: PlanQuizPreviewPage,
    handler: toRoute => {
      showExamCreationPreviewPage(store, toRoute.params);
    },
  },
  {
    name: QuizSummaryPage.name,
    path: '/:classId/plan/quizzes/:quizId',
    component: QuizSummaryPage,
    meta: {
      titleParts: ['QUIZ_NAME', 'quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    name: QuizEditDetailsPage.name,
    path: '/:classId/plan/quizzes/:quizId/edit',
    component: QuizEditDetailsPage,
  },
];
