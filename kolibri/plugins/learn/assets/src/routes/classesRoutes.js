import store from 'kolibri.coreVue.vuex.store';
import { ClassesPageNames } from '../constants';
import { showLessonPlaylist, showLessonResourceViewer } from '../modules/lessonPlaylist/handlers';
import { showClassAssignmentsPage } from '../modules/classAssignments/handlers';
import { showAllClassesPage } from '../modules/classes/handlers';
import { showExam } from '../modules/examViewer/handlers';
import { showExamReport } from '../modules/examReportViewer/handlers';

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
    handler: (toRoute, fromRoute) => {
      const alreadyOnQuiz =
        fromRoute.name === ClassesPageNames.EXAM_VIEWER &&
        toRoute.params.examId === fromRoute.params.examId &&
        toRoute.params.classId === fromRoute.params.classId;
      showExam(store, toRoute.params, alreadyOnQuiz);
    },
  },
  {
    name: ClassesPageNames.EXAM_REPORT_VIEWER,
    path: '/classes/:classId/examReport/:examId/:questionNumber/:questionInteraction',
    handler: toRoute => {
      showExamReport(store, toRoute.params);
    },
  },
];
