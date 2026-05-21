import { createTranslator } from 'kolibri/utils/i18n';

export const picturePasswordStrings = createTranslator('PicturePasswordStrings', {
  // Icon labels used in picture password selection
  tree: {
    message: 'tree',
    context: 'Label for the tree icon used in picture password selection.',
  },
  moon: {
    message: 'moon',
    context: 'Label for the moon icon used in picture password selection.',
  },
  bee: {
    message: 'bee',
    context: 'Label for the bee icon used in picture password selection.',
  },
  star: {
    message: 'star',
    context: 'Label for the star icon used in picture password selection.',
  },
  leaf: {
    message: 'leaf',
    context: 'Label for the leaf icon used in picture password selection.',
  },
  mouse: {
    message: 'mouse',
    context: 'Label for the mouse icon used in picture password selection.',
  },
  water: {
    message: 'water',
    context: 'Label for the water icon used in picture password selection.',
  },
  fish: {
    message: 'fish',
    context: 'Label for the fish icon used in picture password selection.',
  },
  dog: {
    message: 'dog',
    context: 'Label for the dog icon used in picture password selection.',
  },
  smile: {
    message: 'smile',
    context: 'Label for the smile icon used in picture password selection.',
  },
  flower: {
    message: 'flower',
    context: 'Label for the flower icon used in picture password selection.',
  },
  bird: {
    message: 'bird',
    context: 'Label for the bird icon used in picture password selection.',
  },

  // Live-region ordinal guidance after each icon selection
  iconSelectedAsFirst: {
    message: '{icon} selected as first, select the second',
    context:
      'Screen reader announcement after the first icon is chosen in the picture password sequence.',
  },
  iconSelectedAsSecond: {
    message: '{icon} selected as second, select the third',
    context:
      'Screen reader announcement after the second icon is chosen in the picture password sequence.',
  },
  iconSelectedAsThird: {
    message: '{icon} selected as third, confirm all 3 below',
    context:
      'Screen reader announcement after the third icon is chosen in the picture password sequence.',
  },
  allIconsSelected: {
    message: '3 icons already selected. To change an icon, uncheck it and select another.',
    context:
      'Screen reader announcement when the learner taps a disabled icon after 3 have already been chosen.',
  },

  // Submit button aria-label states
  selectThreeIconsToSignIn: {
    message: 'Select 3 pictures to sign in',
    context: 'Submit button label when no pictures have been selected yet.',
  },
  selectTwoMoreIcons: {
    message: 'Select 2 more pictures',
    context: 'Submit button label when exactly 1 picture has been selected.',
  },
  selectOneMoreIcon: {
    message: 'Select 1 more picture',
    context: 'Submit button label when exactly 2 pictures have been selected.',
  },
  signInWithSequence: {
    message: 'Sign in with this sequence: {icon1}, {icon2}, {icon3}',
    context:
      'Submit button label when all 3 pictures have been selected; lists them in order for screen readers.',
  },
  formAriaLabel: {
    message: 'Select 3 pictures below to sign in to Kolibri',
    context:
      'Accessible label for the picture password form. Read by screen readers when the form receives focus.',
  },

  // Sign-in errors
  wrongPicturesTryAgain: {
    message: 'Wrong pictures, try again!',
    context:
      'Error notification and assertive screen reader announcement when the learner submits an incorrect picture password sequence.',
  },

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
  printPicturePasswordsAction: {
    message: 'Print picture passwords',
    context:
      'Dropdown option on the class edit page that navigates to the page for printing learner picture passwords',
  },
  noPicturePasswordDescription: {
    message: 'No picture password',
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

  // Info modal for picture password radio option
  picturePasswordInfoLabel: {
    message: 'About picture passwords',
    context:
      'Accessible label for the information icon button next to the picture password option, and title for the picture password info modal.',
  },
  picturePasswordInfoIntro: {
    message: 'Picture password is designed for early-literacy learners.',
    context: 'Opening sentence in the picture password info modal.',
  },
  picturePasswordInfoBody: {
    message:
      'Learners sign in by selecting a 3-picture sequence unique to their account. Each sequence is auto-generated and assigned by Kolibri and cannot be changed. This feature is only available in facilities with fewer than 1,300 learners.',
    context: 'Main content in the information modal about the picture password sign-in method.',
  },
  picturePasswordInfoNote: {
    message:
      'Learners who join the facility after the 1,300 user limit can sign in with a username.',
    context:
      'Note shown in the picture password info modal about learners added after the limit is reached.',
  },
  picturePasswordAssignedTitle: {
    message: 'New password',
    context:
      'Title of the modal shown after learner signup or facility change when a picture password has been assigned.',
  },
  picturePasswordAssignedDescription: {
    message:
      'Remember these pictures and write them down if you need to. You will need them to sign in to Kolibri in the future.',
    context:
      'Description in the modal shown after learner signup or facility change when a picture password has been assigned.',
  },
  picturePasswordAssignedAddendum: {
    message: 'If you forget, your coach can help.',
    context:
      'Short note in the modal shown after learner signup or facility change when a picture password has been assigned.',
  },
  readyToContinue: {
    message: "I'm ready to continue",
    context:
      'Checkbox label in the picture password confirmation modal that must be checked before continue is enabled.',
  },

  // Info modal for child-friendly icons radio option
  childFriendlyIconsInfoLabel: {
    message: 'About icon styles',
    context:
      'Accessible label for the information icon button next to the child-friendly icons option.',
  },
  childFriendlyIconsInfoDescription: {
    message:
      'The child-friendly icons are designed for young learners. These icons use the same objects as the standard set, in a more colorful and engaging style.',
    context: 'Description shown in the icon styles information modal.',
  },
  childFriendlyIconsColumnLabel: {
    message: 'Child-friendly',
    context: 'Column header for the child-friendly icons column in the icon styles modal.',
  },
  standardIconsColumnLabel: {
    message: 'Standard',
    context: 'Column header for the standard icons column in the icon styles modal.',
  },

  // Exhausted state — inline explanation and info modal
  picturePasswordUnavailableExplanation: {
    message: 'Picture password is not available right now.',
    context:
      'Short explanation shown below the disabled picture password option when the learner limit is reached.',
  },
  picturePasswordUnavailableTitle: {
    message: 'Setting not available',
    context:
      'Title for the modal explaining why picture password is unavailable when the learner limit is reached.',
  },
  picturePasswordUnavailableBody: {
    message:
      'Picture passwords are only available for facilities with up to {learnerLimit} learners.',
    context:
      'Body of the modal explaining why picture password is not available. {learnerLimit} is the maximum number of learners allowed for picture password.',
  },
  picturePasswordUnavailableLearnerCount: {
    message: 'Current number of learners in {facilityName}: {learnerCount}',
    context:
      'Shows the current learner count for the facility in the picture password unavailable modal. {facilityName} is the name of the facility and {learnerCount} is the number of learners.',
  },
  printWithImages: {
    message: 'Print with images',
    context: 'Radio option label for printing the picture password list with icon images',
  },
  printWithTextOnly: {
    message: 'Print with text only',
    context: 'Radio option label for printing the picture password list using text labels only',
  },
  printPasswordsDialogHeader: {
    message: 'Print passwords',
    context: 'Title for the dialog where coaches choose how to print the picture password list',
  },
  printFormatPreviewLabel: {
    message: 'Preview',
    context: 'Label for the live preview section in the print format dialog',
  },
  picturePasswordForLearner: {
    message: 'Password for {learnerName} is a list of {count} pictures: {labels}',
    context:
      "Screen reader sentence describing a learner's picture password when the learner name is known. For example: 'Password for Alice is a list of 3 pictures: moon, water, bird'.",
  },
  picturePasswordList: {
    message: 'A list of {count} pictures: {labels}',
    context:
      "Screen reader sentence describing a picture password when no learner name is available. For example: 'A list of 3 pictures: moon, water, bird'.",
  },

  // Sign-in
  enterPictures: {
    message: 'Enter pictures instead',
    context: 'Link text on the sign-in page for switching to the picture password method',
  },
  enterUsername: {
    message: 'Enter username instead',
    context: 'Link text on the sign-in page for switching to the username & password method',
  },
  isThisYou: {
    message: 'Is this you?',
    context:
      'Title of the confirmation modal shown after a successful picture password sign-in, asking the learner to confirm their identity.',
  },
  yesConfirmAction: {
    message: 'Yes',
    context: 'Button label confirming identity in the picture password sign-in confirmation modal.',
  },
  noGoBackAction: {
    message: 'No, go back',
    context:
      'Button label denying identity and returning to the sign-in grid in the picture password confirmation modal.',
  },
  yourPasswordIs: {
    message: 'Your password is: {labels}',
    context:
      "Screen reader sentence describing the learner's picture password sequence in the confirmation modal. For example: 'Your password is: dog, water, bee'.",
  },
});
