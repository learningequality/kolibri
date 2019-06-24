import { createTranslator } from 'kolibri.utils.i18n';

const coreStrings = createTranslator('CommonCoreStrings', {
  // actions
  cancelAction: 'Cancel',
  closeAction: 'Close',
  continueAction: 'Continue',
  deleteAction: 'Delete',

  // labels, phrases, titles, headers...
  channelsLabel: 'Channels',
  classesLabel: 'Classes',
  coachesLabel: 'Coaches',
  coachLabel: 'Coach',
  completedLabel: 'Completed',
  recommendedLabel: 'Recommended',
  viewAll: 'View all',

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
