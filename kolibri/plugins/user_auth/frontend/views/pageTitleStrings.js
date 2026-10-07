import { createTranslator } from 'kolibri/utils/i18n';

export const pageTitleStrings = createTranslator('UserAuthPageTitleStrings', {
  signInPageTitle: {
    message: 'User Sign In',
    context: 'User sign in page.',
  },
  pictureSignInPageTitle: {
    message: 'Sign in to Kolibri',
    context: 'User sign in page for using picture password.',
  },
  signUpPageTitle: {
    message: 'Create account',
    context:
      "Title of the 'Create account' page accessed by selecting the 'CREATE  AN ACCOUNT' button.",
  },
  authSelectPageTitle: {
    message: 'Sign in or create an account',
    context: 'Title of the page where the user chooses between signing in and creating an account.',
  },
  facilitySelectPageTitle: {
    message: 'Select a facility',
    context:
      'Title of the page where the user picks the facility to sign in to or create an account in.',
  },
  newPasswordPageTitle: {
    message: 'Set a new password',
    context:
      'Title of the page where a user whose account has no password sets one before signing in.',
  },
});
