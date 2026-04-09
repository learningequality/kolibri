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
  picturePasswordWillBeAssigned: {
    message: 'Kolibri will automatically assign a picture password after the user is created.',
    context:
      'Informational message shown in the new user creation form when picture login is enabled and the facility is under the 1300 learner limit, explaining that new learners will receive a picture password automatically.',
  },
  learnMoreAboutLearnerLimit: {
    message: 'Learn more about the learner creation limit',
    context:
      'Accessible label for the "Learn more" button shown when the picture password learner limit is reached, providing full context for screen reader users.',
  },
  signingInHeading: {
    message: 'Signing in',
    context:
      'Section heading shown in the user creation form when picture password is enabled, introducing how the new learner will sign in.',
  },
  learnersPictureSignInInfo: {
    message: 'Learners will sign in by selecting a unique 3-picture code.',
    context:
      'Description shown in the user creation form explaining the picture password sign-in method for learners.',
  },
  howLearnersSignIn: {
    message: 'How learners sign in',
    context: 'Section heading on Facility settings page',
  },
  enterUsernameAndPassword: {
    message: 'Enter username and password',
    context: 'Radio option on Facility settings page for login method',
  },
  enterUsernameOnly: {
    message: 'Enter username only',
    context: 'Radio option on Facility settings page for login method',
  },
  picturePassword: {
    message: 'Picture password',
    context: 'Radio option on Facility settings page for login method',
  },
  picturePasswordDescription: {
    message:
      'Learners sign in by selecting a 3-picture sequence, with the option to use a username instead.',
    context: 'Description for picture password login method',
  },
  childFriendlyIcons: {
    message: 'Child-friendly icons',
    context: 'Radio option for picture password icon style',
  },
  standardIcons: {
    message: 'Standard icons',
    context: 'Radio option for picture password icon style',
  },
  showIconNames: {
    message: 'Show icon names',
    context: 'Checkbox option for picture password settings',
  },
  iconStyle: {
    message: 'Icon style',
    context: 'Label for icon style radio group',
  },
  viewPasswordsAction: {
    message: 'View Passwords',
    context: 'Button label that navigates to the page listing all learner picture passwords',
  },
  noPicturePasswordDescription: {
    message: 'No picture password assigned',
    context: 'Shown in the learner password list when a learner has no picture password set',
  },
  printAction: {
    message: 'Print',
    context: 'Button label to print the learner picture password list',
  },
  allPasswordsHeader: {
    message: 'All passwords',
    context: 'App bar title for the page listing all learner passwords',
  },
  noPasswordSignInDescription: {
    message: 'Learners can sign in with their username',
    context:
      'Shown below the no picture password text to inform that learners without a picture password can still sign in using their username',
  },
  noLearnersInClass: {
    message: 'There are no learners in this class',
    context: 'Shown on the all passwords page when the class has no enrolled learners',
  },
});
