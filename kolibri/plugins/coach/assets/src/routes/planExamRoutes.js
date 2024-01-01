import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import {
  showExamCreationTopicPage,
  showExamCreationBookmarksPage,
  showExamCreationAllBookmarks,
  showExamCreationSearchPage,
  showExamCreationQuestionSelectionPage,
  showExamCreationPreviewPage,
  showPracticeQuizCreationRootPage,
  showPracticeQuizCreationTopicPage,
  showPracticeQuizCreationPreviewPage,
} from '../modules/examCreation/handlers';
import CreatePracticeQuizPage from '../views/plan/CreateExamPage/CreatePracticeQuizPage.vue';
import CreateExamPage from '../views/plan/CreateExamPage';
import CreateExamPreview from '../views/plan/CreateExamPage/CreateExamPreview.vue';
import PlanQuizPreviewPage from '../views/plan/PlanQuizPreviewPage';
import CoachExamsPage from '../views/plan/CoachExamsPage';
import { showExamsPage } from '../modules/examsRoot/handlers';
import QuizSummaryPage from '../views/plan/QuizSummaryPage';
import QuizEditDetailsPage from '../views/plan/QuizEditDetailsPage';
import PlanPracticeQuizPreviewPage from '../views/plan/CreateExamPage/PlanPracticeQuizPreviewPage';

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
    path: '/:classId/plan/quizzes/new',
    component: CreateExamPage,
    children: [
      {
        name: PageNames.QUIZ_SECTION_EDITOR,
        path: ':section_id/edit',
      },
      {
        name: PageNames.QUIZ_REPLACE_QUESTIONS,
        path: ':section_id/replace-questions',
      },
      {
        name: PageNames.QUIZ_SELECT_RESOURCES,
        path: ':section_id/select-resources',

        children: [
          {
            name: PageNames.SELECT_FROM_RESOURCE,
            path: ':topic_id',
          },
        ],
      },
      {
        name: PageNames.BOOK_MARKED_RESOURCES,
        path: ':section_id/book-marked-resources',
        children: [
          {
            name: PageNames.SELECTED_BOOKMARKS,
            path: ':topic_id',
          },
        ],
      },
    ],
  },
  {
    name: PageNames.EXAM_CREATION_PRACTICE_QUIZ,
    path: '/:classId/plan/quizzes/new/practice_quiz',
    component: CreatePracticeQuizPage,
    handler: toRoute => {
      showPracticeQuizCreationRootPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_SELECT_PRACTICE_QUIZ_TOPIC,
    path: '/:classId/plan/quizzes/new/practice_quiz/topic/:topicId',
    component: CreatePracticeQuizPage,
    handler: toRoute => {
      showPracticeQuizCreationTopicPage(store, toRoute.params);
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
    name: PageNames.EXAM_CREATION_BOOKMARKS,
    path: '/:classId/plan/quizzes/new/bookmark/:topicId',
    component: CreateExamPage,
    handler: toRoute => {
      showExamCreationBookmarksPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_BOOKMARKS_MAIN,
    path: '/:classId/plan/quizzes/new/bookmarks',
    component: CreateExamPage,
    handler: toRoute => {
      showExamCreationAllBookmarks(store, toRoute.params);
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
    name: PageNames.EXAM_CREATION_PRACTICE_QUIZ_PREVIEW,
    path: '/:classId/plan/quizzes/new/practice_quiz/preview/',
    component: PlanPracticeQuizPreviewPage,
    handler: toRoute => {
      showPracticeQuizCreationPreviewPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_PREVIEW,
    path: '/:classId/plan/quizzes/new/preview/',
    component: PlanQuizPreviewPage,
    handler: (toRoute, fromRoute) => {
      showExamCreationPreviewPage(store, toRoute.params, fromRoute);
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
