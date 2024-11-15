import { createTranslator } from 'kolibri/utils/i18n';

const commonUserStrings = createTranslator('CommonUserPageStrings', {
  signInPrompt: {
    message: 'Sign in if you have an existing account',
    context:
      'When a device has multiple facilities, this message is above a button which leads the user to the rest of the sign in process.',
  },
  createAccountAction: {
    message: 'Create an account',
    context: 'Label for links that go to the new account form',
  },
  signingInToFacilityAsUserLabel: {
    message: "Signing in to '{facility}' as '{user}'",
    context: 'Label that conveys user is attempting to sign in at a certain facility',
  },
  signingInAsUserLabel: {
    message: "Signing in as '{user}'",
    context: 'Label that conveys user is attempting to sign in with a specific username',
  },
  signInToFacilityLabel: {
    message: "Sign into '{facility}'",
    context: 'Label that conveys user is signing into a specific facility',
  },
  goBackToHomeAction: {
    message: 'Go to home page',
    context: 'Links to the beginning of the authentication flow.',
  },
});

export function userString(key, args) {
  return commonUserStrings.$tr(key, args);
}

export default {
  methods: { userString },
};
