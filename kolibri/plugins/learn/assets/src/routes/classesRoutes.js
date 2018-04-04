import store from 'kolibri.coreVue.vuex.store';
import { ClassesPageNames } from '../constants';
import {
  showAllClassesPage,
  showClassAssignmentsPage,
  showLessonPlaylist,
  showLessonResourceViewer,
} from '../state/actions/classesActions';
import { showExam, showExamReport } from '../state/actions/main';

export default [
  {
    name: ClassesPageNames.ALL_CLASSES,
    path: '/classes',
    handler: () => {
      return showAllClassesPage(store);
    },
  },
  {
    name: ClassesPageNames.CLASS_ASSIGNMENTS,
    path: '/classes/:classId',
    handler: toRoute => {
      const { classId } = toRoute.params;
      return showClassAssignmentsPage(store, classId);
    },
  },
  {
    name: ClassesPageNames.LESSON_PLAYLIST,
    path: '/classes/:classId/lesson/:lessonId',
    handler: toRoute => {
      const { classId, lessonId } = toRoute.params;
      return showLessonPlaylist(store, { classId, lessonId });
    },
  },
  {
    name: ClassesPageNames.LESSON_RESOURCE_VIEWER,
    path: '/classes/:classId/lesson/:lessonId/item/:resourceNumber',
    handler: toRoute => {
      const { lessonId, resourceNumber } = toRoute.params;
      showLessonResourceViewer(store, { lessonId, resourceNumber });
    },
  },
  {
    name: ClassesPageNames.EXAM_VIEWER,
    path: '/classes/:classId/exam/:examId/:questionNumber',
    handler: toRoute => {
      const { classId, examId, questionNumber } = toRoute.params;
      showExam(store, classId, examId, questionNumber);
    },
  },
  {
    name: ClassesPageNames.EXAM_REPORT_VIEWER,
    path: '/classes/:classId/examReport/:examId/:questionNumber/:questionInteraction',
    handler: toRoute => {
      const { classId, examId, questionNumber, questionInteraction } = toRoute.params;
      showExamReport(store, classId, examId, questionNumber, questionInteraction);
    },
  },
];
