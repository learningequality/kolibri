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
});
