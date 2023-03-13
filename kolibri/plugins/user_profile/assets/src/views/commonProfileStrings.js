import { createTranslator } from 'kolibri.utils.i18n';

export const profileStrings = createTranslator('CommonProfileStrings', {
  createAccount: {
    message: 'Create new account',
    context:
      'Text is used on a button or label to indicate the current step to create a new user account',
  },
  mergeAccounts: {
    message: 'Merge Accounts',
    context: 'Text is used on a button or label to merge accounts between facilities.',
  },
});

export function profileString(key, args) {
  return profileStrings.$tr(key, args);
}

export default {
  methods: { profileString },
};
