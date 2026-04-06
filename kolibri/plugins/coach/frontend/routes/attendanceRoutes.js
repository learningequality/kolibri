import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { PageNames } from '../constants';
import AttendanceNewPage from '../views/attendance/AttendanceNewPage';
import AttendanceHistoryPage from '../views/attendance/AttendanceHistoryPage';
import AttendanceEditPage from '../views/attendance/AttendanceEditPage';
import { RouteSegments } from './utils';

const { CLASS } = RouteSegments;

function defaultHandler() {
  pageLoading.value = false;
}

export default [
  {
    name: PageNames.ATTENDANCE_NEW,
    path: CLASS + '/attendance/new',
    component: AttendanceNewPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['CLASS_NAME'],
    },
  },
  {
    name: PageNames.ATTENDANCE_HISTORY,
    path: CLASS + '/attendance/history',
    component: AttendanceHistoryPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['CLASS_NAME'],
    },
  },
  {
    name: PageNames.ATTENDANCE_EDIT,
    path: CLASS + '/attendance/:attendanceId',
    component: AttendanceEditPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['CLASS_NAME'],
    },
  },
];
