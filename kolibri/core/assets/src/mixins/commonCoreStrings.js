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
  channelsLabel: 'Channels',
  classesLabel: 'Classes',
  coachesLabel: 'Coaches',
  coachLabel: 'Coach',
  completedLabel: 'Completed',
  learnersLabel: 'Learners',
  noUsersExistLabel: 'No users exist',
  optionsLabel: 'Options',
  progressLabel: 'Progress',
  recommendedLabel: 'Recommended',
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
