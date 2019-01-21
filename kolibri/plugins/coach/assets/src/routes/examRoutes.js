import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import {
  showExamCreationRootPage,
  showExamCreationTopicPage,
  showExamCreationSearchPage,
  showExamCreationQuestionSelectionPage,
  showExamCreationPreviewPage,
} from '../modules/examCreation/handlers';
import CreateExamPage from '../views/exams/CreateExamPage';
import CreateExamPreview from '../views/exams/CreateExamPage/CreateExamPreview.vue';
import PlanQuizPreviewPage from '../views/new/PlanQuizPreviewPage';

export default [
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
    path: '/old/:classId/exams/new/search/:searchTerm',
    component: CreateExamPage,
    handler: toRoute => {
      showExamCreationSearchPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: PageNames.EXAM_CREATION_QUESTION_SELECTION,
    path: '/:classId/quizzes/new/finalize',
    component: CreateExamPreview,
    handler: (toRoute, fromRoute) => {
      showExamCreationQuestionSelectionPage(store, toRoute, fromRoute);
    },
  },
  {
    name: PageNames.EXAM_CREATION_PREVIEW,
    path: '/:classId/quizzes/new/preview',
    component: PlanQuizPreviewPage,
    handler: toRoute => {
      showExamCreationPreviewPage(store, toRoute.params);
    },
  },
];
