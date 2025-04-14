import store from 'kolibri/store';
import { PageNames } from '../constants';
import CreateExamPage from '../views/quizzes/CreateExamPage';
import SectionEditor from '../views/quizzes/CreateExamPage/sidePanels/SectionSidePanel/SectionEditor.vue';
import ExamsRootPage from '../views/quizzes/ExamsRootPage';
import QuizSummaryPage from '../views/quizzes/QuizSummaryPage';
import SectionOrder from '../views/quizzes/CreateExamPage/sidePanels/SectionSidePanel/SectionOrder.vue';
import SectionSidePanel from '../views/quizzes/CreateExamPage/sidePanels/SectionSidePanel/index.vue';
import QuizResourceSelection from '../views/quizzes/CreateExamPage/sidePanels/QuizResourceSelection/index.vue';
import LearnerQuizPage from '../views/common/reports/LearnerQuizPage.vue';
import QuizPreviewPage from '../views/quizzes/reports/QuizPreviewPage.vue';
import { generateExamReportDetailHandler } from '../modules/examReportDetail/handlers';
import QuestionLearnersPage from '../views/common/reports/QuestionLearnersPage.vue';
import SelectionIndex from '../views/common/resourceSelection/subPages/SelectionIndex.vue';
import SelectFromTopicTree from '../views/common/resourceSelection/subPages/SelectFromTopicTree.vue';
import SelectFromBookmarks from '../views/common/resourceSelection/subPages/SelectFromBookmarks.vue';
import ManageSelectedResources from '../views/common/resourceSelection/subPages/ManageSelectedResources.vue';
import ManageSelectedQuestions from '../views/quizzes/CreateExamPage/sidePanels/QuizResourceSelection/subPages/ManageSelectedQuestions.vue';
import SelectFromQuizSearchResults from '../views/quizzes/CreateExamPage/sidePanels/QuizResourceSelection/subPages/SelectFromQuizSearchResults.vue';
import SearchQuizFilters from '../views/quizzes/CreateExamPage/sidePanels/QuizResourceSelection/subPages/SearchQuizFilters.vue';
import PreviewSelectedResources from '../views/common/resourceSelection/subPages/PreviewSelectedResources/index.vue';
import {
  generateQuestionDetailHandler,
  questionRootRedirectHandler,
} from '../modules/questionDetail/handlers';
import QuestionsSettings from '../views/quizzes/CreateExamPage/sidePanels/QuizResourceSelection/subPages/QuestionsSettings.vue';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const {
  CLASS,
  OPTIONAL_CLASS,
  QUIZ,
  ALL_QUIZZES,
  OPTIONAL_GROUP,
  LEARNER,
  QUESTION,
  TRY,
  INTERACTION,
} = RouteSegments;

export default [
  {
    name: PageNames.EXAMS_ROOT,
    path: OPTIONAL_CLASS + ALL_QUIZZES,
    component: ExamsRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.EXAMS_ROOT, next)) {
        return;
      }
    },
    meta: {
      titleParts: ['quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.EXAM_CREATION_ROOT,
    path: CLASS + QUIZ + '/edit/:sectionIndex',
    component: CreateExamPage,
    meta: {
      titleParts: [],
    },
    children: [
      {
        name: PageNames.QUIZ_SECTION_SIDE_PANEL,
        path: 'details',
        component: SectionSidePanel,
        children: [
          {
            name: PageNames.QUIZ_SECTION_EDITOR,
            path: 'edit',
            component: SectionEditor,
          },
          {
            name: PageNames.QUIZ_SECTION_ORDER,
            path: 'section-order',
            component: SectionOrder,
          },
        ],
      },
      {
        name: PageNames.QUIZ_SELECT_RESOURCES,
        path: 'select-resources',
        component: QuizResourceSelection,
        redirect: 'select-resources/landing-settings',
        children: [
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_LANDING_SETTINGS,
            path: 'landing-settings',
            component: QuestionsSettings,
            props: {
              isLanding: true,
            },
          },
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_INDEX,
            path: 'index',
            component: SelectionIndex,
          },
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_BOOKMARKS,
            path: 'bookmarks',
            component: SelectFromBookmarks,
          },
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
            path: 'channels',
            component: SelectFromTopicTree,
          },
          {
            name: PageNames.QUIZ_PREVIEW_SELECTED_RESOURCES,
            path: 'preview-resources',
            component: ManageSelectedResources,
          },
          {
            name: PageNames.QUIZ_PREVIEW_SELECTED_QUESTIONS,
            path: 'preview-questions',
            component: ManageSelectedQuestions,
          },
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_SETTINGS,
            path: 'settings',
            component: QuestionsSettings,
          },
          {
            name: PageNames.QUIZ_PREVIEW_RESOURCE,
            path: 'preview',
            component: PreviewSelectedResources,
            props: toRoute => {
              const contentId = toRoute.query.contentId;
              return {
                contentId,
              };
            },
          },
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_SEARCH,
            path: 'search',
            component: SearchQuizFilters,
          },
          {
            name: PageNames.QUIZ_SELECT_RESOURCES_SEARCH_RESULTS,
            path: 'search-results',
            component: SelectFromQuizSearchResults,
          },
        ],
      },
      {
        name: PageNames.QUIZ_SELECT_PRACTICE_QUIZ,
        path: 'select-quiz',
        redirect: to => {
          const { params } = to;
          return {
            name: PageNames.QUIZ_SELECT_RESOURCES_INDEX,
            params,
            query: {
              selectPracticeQuiz: true,
            },
          };
        },
      },
    ],
  },
  {
    name: PageNames.EXAM_SUMMARY,
    path: CLASS + QUIZ + '/:tabId?',
    component: QuizSummaryPage,
    meta: {
      titleParts: ['QUIZ_NAME', 'quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    path: CLASS + OPTIONAL_GROUP + QUIZ + LEARNER,
    name: PageNames.QUIZ_LEARNER_PAGE_ROOT,
    redirect: to => {
      const { params } = to;
      return {
        name: PageNames.QUIZ_LEARNER_REPORT,
        params: {
          ...params,
          questionId: 0,
          interactionIndex: 0,
          tryIndex: 0,
        },
      };
    },
  },
  {
    name: PageNames.QUIZ_LEARNER_REPORT,
    path: CLASS + OPTIONAL_GROUP + QUIZ + LEARNER + TRY + QUESTION + INTERACTION,
    component: LearnerQuizPage,
    handler: generateExamReportDetailHandler(['groupId', 'learnerId', 'quizId']),
    meta: {
      titleParts: ['LEARNER_NAME', 'QUIZ_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.QUIZ_PREVIEW,
    path: CLASS + QUIZ + '/preview',
    component: QuizPreviewPage,
    handler() {
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['previewLabel', 'QUIZ_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.QUIZ_QUESTION_PAGE_ROOT,
    path: CLASS + OPTIONAL_GROUP + QUIZ + QUESTION,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return questionRootRedirectHandler(params, PageNames.QUIZ_QUESTION_REPORT, next);
    },
  },
  {
    name: PageNames.QUIZ_QUESTION_REPORT,
    path: CLASS + OPTIONAL_GROUP + QUIZ + QUESTION + LEARNER + INTERACTION,
    component: QuestionLearnersPage,
    handler: generateQuestionDetailHandler(['groupId', 'lessonId', 'exerciseId', 'questionId']),
    meta: {
      // Leaves out info on question
      titleParts: ['questionLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
];
