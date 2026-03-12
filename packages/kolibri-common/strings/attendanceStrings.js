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
    message: '{count, number} present',
    context: 'Count of learners marked as present in an attendance session, e.g. "16 present"',
  },
  absentCount: {
    message: '{count, number} absent',
    context: 'Count of learners marked as absent in an attendance session, e.g. "8 absent"',
  },
  pageHeading: {
    message: 'Mark attendance: {date} ({time})',
    context: 'Page heading and app bar title showing the date and time of the attendance session',
  },
  searchPlaceholder: {
    message: 'Search for a learner',
    context: 'Placeholder text for the search box used to filter the learner list',
  },
  learnerColumnHeader: {
    message: 'Learner',
    context: 'Visually hidden table column header for learner names',
  },
  statusColumnHeader: {
    message: 'Status',
    context: 'Visually hidden table column header for attendance status',
  },
  presentLabel: {
    message: 'Present',
    context: 'Label shown next to the toggle when a learner is marked as present',
  },
  markAllPresentLabel: {
    message: 'Mark all learners present',
    context: 'Label for the switch that marks all learners as present',
  },
  markAllModalTitle: {
    message: 'Mark all {count, number} learners as present?',
    context:
      'Title of the confirmation modal when marking all learners present, showing total learner count',
  },
  markAllModalDescription: {
    message:
      'This will override {count, number} {count, plural, one {learner} other {learners}} currently marked absent.',
    context:
      'Description in the confirmation modal showing how many currently-absent learners will be overridden',
  },
  submitSuccessMessage: {
    message: 'Attendance saved',
    context: 'Snackbar message shown after successfully saving an attendance session',
  },
  submitErrorMessage: {
    message: 'There was a problem saving attendance',
    context: 'Snackbar message shown when saving an attendance session fails',
  },
  unsavedChangesTitle: {
    message: 'Unsaved changes',
    context: 'Title of modal warning about unsaved attendance changes',
  },
  unsavedChangesDescription: {
    message: 'You have unsaved changes. Are you sure you want to leave?',
    context: 'Description in the modal warning about unsaved attendance changes',
  },
  leaveAction: {
    message: 'Leave',
    context: 'Button text to confirm leaving the page with unsaved changes',
  },
  stayAction: {
    message: 'Stay',
    context: 'Button text to stay on the page and keep editing',
  },
  submitAttendanceAction: {
    message: 'Submit attendance',
    context: 'Button text to submit the attendance session',
  },
  markAllPresentAction: {
    message: 'Mark all present',
    context: 'Button text to confirm marking all learners as present',
  },
  learnersLabel: {
    message: 'Learners:',
    context: 'Label preceding the present/absent counts in the bottom bar of the attendance form',
  },
});
