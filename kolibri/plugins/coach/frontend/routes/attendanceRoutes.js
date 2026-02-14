import store from 'kolibri/store';
import { PageNames } from '../constants';
import AttendanceNewPage from '../views/attendance/AttendanceNewPage';
import AttendanceHistoryPage from '../views/attendance/AttendanceHistoryPage';
import AttendanceEditPage from '../views/attendance/AttendanceEditPage';
import { RouteSegments } from './utils';

const { CLASS } = RouteSegments;

export default [
  {
    name: PageNames.ATTENDANCE_NEW,
    path: CLASS + '/attendance/new',
    component: AttendanceNewPage,
    handler: async toRoute => {
      await store.dispatch('initClassInfo', toRoute.params.classId);
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['attendanceLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.ATTENDANCE_HISTORY,
    path: CLASS + '/attendance/history',
    component: AttendanceHistoryPage,
    handler: async toRoute => {
      await store.dispatch('initClassInfo', toRoute.params.classId);
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['attendanceHistoryLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.ATTENDANCE_EDIT,
    path: CLASS + '/attendance/:attendanceId',
    component: AttendanceEditPage,
    handler: async toRoute => {
      await store.dispatch('initClassInfo', toRoute.params.classId);
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['attendanceLabel', 'CLASS_NAME'],
    },
  },
];
