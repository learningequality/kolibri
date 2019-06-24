import { createTranslator } from 'kolibri.utils.i18n';

const coreStrings = createTranslator('CommonCoreStrings', {
  // actions
  cancelAction: 'Cancel',
  closeAction: 'Close',
  confirmAction: 'Confirm',
  continueAction: 'Continue',
  deleteAction: 'Delete',
  removeAction: 'Remove',
  saveAction: 'Save',
  saveChangesAction: 'Save changes',
  showAction: 'Show',

  // labels, phrases, titles, headers...
  allLabel: 'All',
  allLessonsLabel: 'All lessons',
  channelsLabel: 'Channels',
  classesLabel: 'Classes',
  coachesLabel: 'Coaches',
  coachLabel: 'Coach',
  completedLabel: 'Completed',
  fullNameLabel: 'Full name',
  learnersLabel: 'Learners',
  noUsersExistLabel: 'No users exist',
  optionsLabel: 'Options',
  progressLabel: 'Progress',
  questionNumberLabel: 'Question { questionNumber, number }',
  recommendedLabel: 'Recommended',
  resourcesLabel: 'Resources',
  searchLabel: 'Search',
  usernameLabel: 'Username',
  viewMoreLabel: 'View more',


  // notifications
  requiredFieldLabel: 'This field is required',

  // empty states

  // toggles

  // formatted values

  // Errors
});

const coreStringsMixin = {
  methods: {
    coreCommon$tr(key, args) {
      return coreStrings.$tr(key, args);
    },
  },
};

export { coreStrings, coreStringsMixin };
