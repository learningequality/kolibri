import store from 'kolibri/store';
import { PageNames } from '../constants';
import CreateExamPage from '../views/quizzes/CreateExamPage';
import SectionEditor from '../views/quizzes/CreateExamPage/SectionEditor.vue';
import ResourceSelection from '../views/quizzes/CreateExamPage/ResourceSelection.vue';
import ReplaceQuestions from '../views/quizzes/CreateExamPage/ReplaceQuestions.vue';
import ExamsRootPage from '../views/quizzes/ExamsRootPage';
import QuizSummaryPage from '../views/quizzes/QuizSummaryPage';
import SectionOrder from '../views/quizzes/CreateExamPage/SectionOrder';
import LearnerQuizPage from '../views/common/reports/LearnerQuizPage.vue';
import QuizPreviewPage from '../views/quizzes/reports/QuizPreviewPage.vue';
import { generateExamReportDetailHandler } from '../modules/examReportDetail/handlers';
import QuestionLearnersPage from '../views/common/reports/QuestionLearnersPage.vue';
import {
  generateQuestionDetailHandler,
  questionRootRedirectHandler,
} from '../modules/questionDetail/handlers';
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
        name: PageNames.QUIZ_SECTION_EDITOR,
        path: 'edit',
        component: SectionEditor,
      },
      {
        name: PageNames.QUIZ_REPLACE_QUESTIONS,
        path: 'replace-questions',
        component: ReplaceQuestions,
      },
      {
        name: PageNames.QUIZ_SELECT_RESOURCES,
        path: 'select-resources/:topic_id?',
        component: ResourceSelection,
      },
      {
        name: PageNames.QUIZ_SECTION_ORDER,
        path: 'section-order',
        component: SectionOrder,
      },
      {
        name: PageNames.QUIZ_SELECT_PRACTICE_QUIZ,
        path: 'select-quiz/:topic_id?',
        component: ResourceSelection,
        props: {
          selectPracticeQuiz: true,
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
