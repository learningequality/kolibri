import store from 'kolibri/store';
import MarkAttendancePage from '../views/attendance/MarkAttendancePage';
import AttendanceHistoryPage from '../views/attendance/AttendanceHistoryPage';
import { PageNames } from '../constants';
import { classIdParamRequiredGuard } from './utils';

export default [
  {
    name: PageNames.ATTENDANCE_ROOT,
    path: '/:classId/attendance/new',
    component: MarkAttendancePage,
    handler: async (toRoute, fromRoute, next) => {
      if (classIdParamRequiredGuard(toRoute, MarkAttendancePage.name, next)) {
        return;
      }
      await store.dispatch('initClassInfo', toRoute.params.classId);
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['markAttendanceTitle', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.ATTENDANCE_HISTORY,
    path: '/:classId/attendance/history',
    component: AttendanceHistoryPage,
    handler: async (toRoute, fromRoute, next) => {
      if (classIdParamRequiredGuard(toRoute, AttendanceHistoryPage.name, next)) {
        return;
      }
      await store.dispatch('initClassInfo', toRoute.params.classId);
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['attendanceHistoryTitle', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.ATTENDANCE_SESSION,
    path: '/:classId/attendance/:sessionId',
    component: MarkAttendancePage,
    handler: async (toRoute, fromRoute, next) => {
      if (classIdParamRequiredGuard(toRoute, MarkAttendancePage.name, next)) {
        return;
      }
      await store.dispatch('initClassInfo', toRoute.params.classId);
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['markAttendanceTitle', 'CLASS_NAME'],
    },
  },
];
