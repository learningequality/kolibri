import { ClassesPageNames } from './constants';
import {
  showAllClassesPage,
  showClassAssignmentsPage,
  showLessonPlaylist,
} from './state/actions/classesActions';
import store from 'kolibri.coreVue.vuex.store';

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
];
