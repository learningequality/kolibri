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
  editPageHeading: {
    message: 'Edit attendance: {date} ({time})',
    context: 'Page heading and app bar title when editing an existing attendance session',
  },
  saveConfirmationTitle: {
    message: 'Save {count, number} {count, plural, one {change} other {changes}}?',
    context:
      'Title of the confirmation modal when saving edited attendance, showing the number of changes made',
  },
  updateSuccessMessage: {
    message: 'Attendance updated',
    context: 'Snackbar message shown after successfully updating an existing attendance session',
  },
  markAllPresentAction: {
    message: 'Mark all present',
    context: 'Button text to confirm marking all learners as present',
  },
  learnersLabel: {
    message: 'Learners:',
    context: 'Label preceding the present/absent counts in the bottom bar of the attendance form',
  },
  noSessionsFoundMessage: {
    message: 'No attendance sessions found',
    context: 'Empty state message when no attendance sessions match the current filter',
  },
  dateLabel: {
    message: 'Date',
    context: 'Column header for the date of an attendance session',
  },
  attendanceHistoryTitle: {
    message: 'Attendance History',
    context: 'Page heading for viewing attendance history',
  },
  backToClassLabel: {
    message: 'Back to class',
    context: 'Link text to navigate back to the class home page',
  },
  dateRangeLabel: {
    message: 'Date range',
    context: 'Label for the date range filter dropdown',
  },
  pastDays: {
    message: 'Past {count, number} days',
    context:
      'Date range filter option for sessions in the past N days, e.g. "Past 7 days", "Past 30 days"',
  },
  allTime: {
    message: 'All time',
    context: 'Date range filter option to show all attendance sessions',
  },
  customLabel: {
    message: 'Custom',
    context: 'Date range filter option to select a custom date range',
  },
  customDateRangeTitle: {
    message: 'Select date range',
    context: 'Title for the custom date range picker dialog',
  },
  customDateRangeDescription: {
    message: 'Choose start and end dates for filtering attendance sessions',
    context: 'Description for the custom date range picker dialog',
  },
  startDateLabel: {
    message: 'Start date',
    context: 'Label for the start date field in the date range picker',
  },
  endDateLabel: {
    message: 'End date',
    context: 'Label for the end date field in the date range picker',
  },
  previousMonthLabel: {
    message: 'Previous month',
    context: 'Accessible label for the previous month navigation button in date picker',
  },
  nextMonthLabel: {
    message: 'Next month',
    context: 'Accessible label for the next month navigation button in date picker',
  },
  applyLabel: {
    message: 'Apply',
    context: 'Button label to apply the selected custom date range',
  },
  presentColumnHeader: {
    message: 'Present',
    context: 'Column header for the count of learners present',
  },
  absentColumnHeader: {
    message: 'Absent',
    context: 'Column header for the count of learners absent',
  },
  previouslyEnrolledLabel: {
    message: '{name} (Previously enrolled)',
    context:
      'Learner name with suffix in attendance history when that learner is no longer enrolled in the class. The name placeholder allows translators to reorder the components.',
  },
  noLearnersInClassMessage: {
    message: 'There are no learners in this class',
    context:
      'Message shown on the attendance form or history page when the class currently has no learners',
  },
  noSessionsEnrollMessage: {
    message: 'No attendance sessions yet. Enroll learners to mark attendance',
    context:
      'Empty state message when no attendance sessions exist and no learners are enrolled in the class',
  },
});
