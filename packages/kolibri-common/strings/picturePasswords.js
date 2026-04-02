import { createTranslator } from 'kolibri/utils/i18n';

export const picturePasswordStrings = createTranslator('PicturePasswordStrings', {
  learnerLimitReachedHeading: {
    message: 'Learner limit reached',
    context:
      'Title for the modal for that notifies admins when facility reaches the learner limit.',
  },
  learnerLimitReachedContext: {
    message:
      'This facility is using picture passwords, which are available only for facilities with fewer than 1300 learners.',
    context: 'Part of the learner limit notice modal that provides context for the notice.',
  },
  learnerLimitReachedNotice: {
    message:
      "You've reached this limit. To add more learners, change the learner sign-in method in Facility settings.",
    context: 'Part of the learner limit notice modal that provides instruction for the notice.',
  },
  goToFacilitySettingsLabel: {
    message: 'Go to facility settings',
    context: 'Button label for navigating to facility settings page.',
  },
  learnerCreationDisabled: {
    message: 'Learner creation is currently disabled due to reaching limit of 1300 learners.',
    context:
      'Message shown to admins when they cannot create new learner accounts because the facility has reached the picture password learner limit.',
  },
});
