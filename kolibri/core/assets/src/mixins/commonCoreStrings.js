import { createTranslator } from 'kolibri.utils.i18n';

export const coreStrings = createTranslator('CommonCoreStrings', {
  // actions
  cancelAction: 'Cancel',
  clearAction: {
    message: 'Clear',
    context:
      '\nButton that allows to clear a single *task* from the list in the task manager.\n\n\n',
  },
  closeAction: 'Close',
  confirmAction: 'Confirm',
  continueAction: 'Continue',
  deleteAction: 'Delete',
  editDetailsAction: 'Edit details',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  retryAction: 'Retry',
  removeAction: 'Remove',
  saveAction: 'Save',
  saveChangesAction: 'Save changes',
  selectAllOnPageAction: 'Select all on page',
  showAction: 'Show',
  updateAction: 'Update',
  viewAction: 'View',
  viewTasksAction: 'View tasks',

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
  loadingLabel: 'Loading…',
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
  genderOptionNotSpecified: 'Not specified',
  birthYearNotSpecified: 'Not specified',
  identifierInputTooltip: {
    message:
      'Examples: a student ID number or an existing user identification number. Avoid using highly sensitive personal information because it might put your users at risk.',
    context:
      "Tooltip with information referring to the optional 'Identifier' field in the 'Create new user' form.\n",
  },
  identifierTooltip: 'Examples: a student ID number or an existing user identification number.',
  identifierAriaLabel: {
    message: 'About providing an identifier or ID number',
    context:
      "\nCould also be translated as \"View information about providing identifier\"\n\nAll 'AriaLabel' type of messages are providing additional context to the screen-reader users. \n\nIn this case the screen-reader will announce the message to the user indicating that they can access more information and examples about the 'Identifier' through the 'i' icon.",
  },
});

export default {
  methods: {
    coreString(key, args) {
      return coreStrings.$tr(key, args);
    },
  },
};
