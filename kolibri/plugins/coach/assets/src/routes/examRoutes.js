import { PageNames } from '../constants';
import CreateExamPage from '../views/quizzes/CreateExamPage';
import SectionEditor from '../views/quizzes/CreateExamPage/SectionEditor.vue';
import ResourceSelection from '../views/quizzes/CreateExamPage/ResourceSelection.vue';
import ReplaceQuestions from '../views/quizzes/CreateExamPage/ReplaceQuestions.vue';
import ExamsRootPage from '../views/quizzes/ExamsRootPage';
import QuizSummaryPage from '../views/quizzes/QuizSummaryPage';
import SectionOrder from '../views/quizzes/CreateExamPage/SectionOrder';

const CLASS = '/:classId';
const QUIZ = '/quizzes/:quizId';
const ALL_QUIZZES = '/quizzes';

function path(...args) {
  return args.join('');
}

export default [
  {
    name: PageNames.EXAMS_ROOT,
    path: path(CLASS, ALL_QUIZZES),
    component: ExamsRootPage,
    meta: {
      titleParts: ['quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.EXAM_CREATION_ROOT,
    path: path(CLASS, QUIZ, '/edit/:sectionIndex'),
    component: CreateExamPage,
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
    path: path(CLASS, QUIZ, '/:tabId?'),
    component: QuizSummaryPage,
    meta: {
      titleParts: ['QUIZ_NAME', 'quizzesLabel', 'CLASS_NAME'],
    },
  },
];
