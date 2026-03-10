import { createTranslator } from 'kolibri/utils/i18n';

export const attendanceStrings = createTranslator('AttendanceStrings', {
  attendanceLabel: {
    message: 'Attendance',
    context: 'Title label for the attendance section on the coach home page',
  },
  markAttendanceAction: {
    message: 'Mark attendance',
    context: 'Button label to start a new attendance session',
  },
  viewHistoryAction: {
    message: 'View history',
    context: 'Link text to view all past attendance sessions',
  },
  noSessionsMessage: {
    message: 'No attendance sessions yet',
    context: 'Empty state message when no attendance sessions have been created',
  },
  presentCount: {
    message: '{count, number} {count, plural, one {present} other {present}}',
    context: 'Count of learners marked as present in an attendance session, e.g. "16 present"',
  },
  absentCount: {
    message: '{count, number} {count, plural, one {absent} other {absent}}',
    context: 'Count of learners marked as absent in an attendance session, e.g. "8 absent"',
  },
});
