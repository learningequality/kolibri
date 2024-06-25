import { PageNames } from '../constants';
import CreateExamPage from '../views/plan/CreateExamPage';
import SectionEditor from '../views/plan/CreateExamPage/SectionEditor.vue';
import ResourceSelection from '../views/plan/CreateExamPage/ResourceSelection.vue';
import ReplaceQuestions from '../views/plan/CreateExamPage/ReplaceQuestions.vue';
import CoachExamsPage from '../views/plan/CoachExamsPage';
import QuizSummaryPage from '../views/plan/QuizSummaryPage';

export default [
  {
    name: PageNames.EXAMS,
    path: '/:classId/plan/quizzes',
    component: CoachExamsPage,
    meta: {
      titleParts: ['quizzesLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.EXAM_CREATION_ROOT,
    path: '/:classId/plan/quizzes/:quizId/edit/:sectionIndex',
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
    name: QuizSummaryPage.name,
    path: '/:classId/plan/quizzes/:quizId',
    component: QuizSummaryPage,
    meta: {
      titleParts: ['QUIZ_NAME', 'quizzesLabel', 'CLASS_NAME'],
    },
  },
];
