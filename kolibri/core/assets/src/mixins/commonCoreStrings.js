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
  updateAction: 'Update',

  // labels, phrases, titles, headers...
  adminLabel: 'Admin',
  allLabel: 'All',
  allLessonsLabel: 'All lessons',
  birthYearLabel: 'Birth year',
  channelsLabel: 'Channels',
  classCoachLabel: 'Class coach',
  classNameLabel: 'Class name',
  classesLabel: 'Classes',
  coachLabel: 'Coach',
  coachesLabel: 'Coaches',
  completedLabel: 'Completed',
  devicePermissionsLabel: 'Device permissions',
  facilityCoachLabel: 'Facility coach',
  facilityLabel: 'Facility',
  fullNameLabel: 'Full name',
  genderLabel: 'Gender',
  identifierLabel: 'Identifier',
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
  userTypeLabel: 'User type',
  usernameLabel: 'Username',
  usersLabel: 'Users',
  viewMoreAction: 'View more',

  // Errors
  requiredFieldError: 'This field is required',
  usernameNotAlphaNumError: 'Username can only contain letters, numbers, and underscores',

  // Demographic-specific strings
  genderOptionMale: 'Male',
  genderOptionFemale: 'Female',
  genderOptionOther: 'Other',
  notSpecifiedOption: 'Not specified',
  identifierInputTooltip:
    'Examples: a student ID number or an existing user identification number. Avoid using highly sensitive personal information because it might put your users at risk.',
  identifierTooltip: 'Examples: a student ID number or an existing user identification number.',
  identifierAriaLabel: 'About providing an identifier or ID number',
});

export default {
  methods: {
    coreString(key, args) {
      return coreStrings.$tr(key, args);
    },
  },
};
