import { createTranslator } from 'kolibri.utils.i18n';

export const coreStrings = createTranslator('CommonCoreStrings', {
  // actions
  cancelAction: 'Cancel',
  closeAction: 'Close',
  confirmAction: 'Confirm',
  continueAction: 'Continue',
  deleteAction: 'Delete',
  editDetailsAction: 'Edit details',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  removeAction: 'Remove',
  saveAction: 'Save',
  saveChangesAction: 'Save changes',
  showAction: 'Show',

  // labels, phrases, titles, headers...
  adminLabel: 'Admin',
  allLabel: 'All',
  allLessonsLabel: 'All lessons',
  channelsLabel: 'Channels',
  classesLabel: 'Classes',
  classNameLabel: 'Class name',
  coachesLabel: 'Coaches',
  coachLabel: 'Coach',
  completedLabel: 'Completed',
  devicePermissionsLabel: 'Device permissions',
  facilityCoachLabel: 'Facility coach',
  facilityLabel: 'Facility',
  fullNameLabel: 'Full name',
  kolibriLabel: 'Kolibri',
  learnerLabel: 'Learner',
  learnersLabel: 'Learners',
  lessonsLabel: 'Lessons',
  noUsersExistLabel: 'No users exist',
  optionsLabel: 'Options',
  passwordLabel: 'Password',
  progressLabel: 'Progress',
  questionNumberLabel: 'Question { questionNumber, number }',
  quizzesLabel: 'Quizzes',
  resourcesLabel: 'Resources',
  searchLabel: 'Search',
  showCorrectAnswerLabel: 'Show correct answer',
  signInLabel: 'Sign in',
  usageAndPrivacyLabel: 'Usage and privacy',
  usernameLabel: 'Username',
  usersLabel: 'Users',
  userTypeLabel: 'User type',
  viewMoreAction: 'View more',

  // notifications
  passwordsMismatchError: 'Passwords do not match',
  requiredFieldLabel: 'This field is required',
  usernameNotAlphaNumError: 'Username can only contain letters, numbers, and underscores',

  // empty states

  // toggles

  // formatted values

  // Errors
});

export default {
  methods: {
    coreCommon$tr(key, args) {
      return coreStrings.$tr(key, args);
    },
  },
};
