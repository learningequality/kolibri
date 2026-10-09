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
    message: 'There are no attendance sessions',
    context: 'Empty state message when no attendance sessions have been created',
  },
  presentCount: {
    message: '{count, plural, one {# present} other {# present}}',
    context:
      'Count of learners marked as present in an attendance session, e.g. "16 present". Consider if it requires PLURAL in your locale.',
  },
  absentCount: {
    message: '{count, plural, one {# absent} other {# absent}}',
    context:
      'Count of learners marked as absent in an attendance session, e.g. "8 absent". Consider if it requires PLURAL in your locale.',
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
    message:
      '{count, plural, one {Mark # learner as present?} other {Mark all # learners as present?}}',
    context:
      'Title of the confirmation modal when marking all learners present, showing total learner count. Consider if it requires PLURAL in your locale.',
  },
  submitSuccessMessage: {
    message: 'Attendance saved',
    context: 'Snackbar message shown after successfully saving an attendance session',
  },
  submitErrorMessage: {
    message: 'There was a problem saving attendance',
    context: 'Snackbar message shown when saving an attendance session fails',
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
  learnersLabel: {
    message: 'Learners:',
    context: 'Label preceding the present/absent counts in the bottom bar of the attendance form',
  },
  dateLabel: {
    message: 'Date',
    context: 'Column header for the date of an attendance session',
  },
  attendanceHistoryTitle: {
    message: 'Attendance history',
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
  presentColumnHeader: {
    message: 'Present',
    context:
      'Column header for the count of learners present. Consider if it requires PLURAL in your locale.',
  },
  absentColumnHeader: {
    message: 'Absent',
    context:
      'Column header for the count of learners absent. Consider if it requires PLURAL in your locale.',
  },
  previouslyEnrolledLabel: {
    message: '{name} (Previously enrolled)',
    context:
      'Learner name with suffix in attendance history when that learner is no longer enrolled in the class. The name placeholder allows translators to reorder the components.',
  },
  noSessionsEnrollMessage: {
    message: 'There are no attendance sessions. Enroll learners to mark attendance',
    context:
      'Empty state message when no attendance sessions exist and no learners are enrolled in the class',
  },
});
