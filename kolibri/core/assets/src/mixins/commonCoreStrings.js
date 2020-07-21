import { createTranslator } from 'kolibri.utils.i18n';
import notificationStrings from './notificationStrings';

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
  editAction: 'Edit',
  editDetailsAction: 'Edit details',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  registerAction: {
    message: 'Register',
    context: 'Register a facility to the Kolibri Data Portal',
  },
  retryAction: 'Retry',
  removeAction: 'Remove',
  saveAction: 'Save',
  saveChangesAction: 'Save changes',
  selectAllOnPageAction: 'Select all on page',
  showAction: 'Show',
  startOverAction: 'Start over',
  syncAction: 'Sync',
  updateAction: 'Update',
  viewAction: 'View',
  viewTasksAction: 'View tasks',

  // labels, phrases, titles, headers...
  adminLabel: 'Admin',
  allClassesLabel: 'All classes',
  allFacilitiesLabel: 'All facilities',
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
  deviceNameLabel: 'Device name',
  devicePermissionsLabel: 'Device permissions',
  facilityCoachLabel: 'Facility coach',
  facilityLabel: 'Facility',
  facilitiesLabel: 'Facilities',
  facilityName: 'Facility name',
  facilityNameWithId: '{facilityName} ({id})',
  facilityDuplicated: 'There is already a facility with this name on this device',
  fullNameLabel: 'Full name',
  genderLabel: 'Gender',
  identifierLabel: 'Identifier',
  kolibriLabel: 'Kolibri',
  learnerLabel: 'Learner',
  learnersLabel: 'Learners',
  lessonsLabel: 'Lessons',
  loadingLabel: 'Loading…',
  nameLabel: 'Name',
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
  superAdminLabel: 'Super admin',
  tasksLabel: 'Tasks',
  usageAndPrivacyLabel: 'Usage and privacy',
  userTypeLabel: 'User type',
  usernameLabel: 'Username',
  usersLabel: 'Users',
  viewMoreAction: 'View more',

  // Notifications
  changesSavedNotification: 'Changes saved',
  changesNotSavedNotification: 'Changes not saved',

  // Errors
  requiredFieldError: 'This field is required',
  usernameNotAlphaNumError: 'Username can only contain letters, numbers, and underscores',
  invalidCredentialsError: 'Incorrect username or password',

  // Formatting
  nameWithIdInParens: '{name} ({id})',
  quotedPhrase: `'{phrase}'`,
  dashSeparatedPair: '{item1} - {item2}',
  dashSeparatedTriple: '{item1} - {item2} - {item3}',
  labelColonThenDetails: '{label}: {details}',
  commaSeparatedPair: '{item1}, {item2}',

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
    showSnackbarNotification(key, args, coreCreateSnackbarArgs) {
      let text = notificationStrings.$tr(key, args || {});
      if (coreCreateSnackbarArgs) {
        this.$store.commit('CORE_CREATE_SNACKBAR', {
          ...coreCreateSnackbarArgs,
          text,
        });
      } else {
        this.$store.dispatch('createSnackbar', text);
      }
    },
  },
};
