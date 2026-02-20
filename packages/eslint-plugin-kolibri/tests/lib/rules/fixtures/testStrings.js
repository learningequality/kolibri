// Test fixture for cross-file translator imports
import { createTranslator } from 'kolibri/utils/i18n';

export const testStrings = createTranslator('TestNamespace', {
  userLabel: 'User',
  adminLabel: 'Administrator',
  coachLabel: 'Coach',
  learnerLabel: 'Learner',
  goBackAction: 'Go back',
});

export const anotherTranslator = createTranslator('AnotherNamespace', {
  saveAction: 'Save',
  cancelAction: 'Cancel',
  deleteAction: 'Delete',
});

// Translator with object-format messages (message + context)
export const objectFormatStrings = createTranslator('ObjectFormatNamespace', {
  welcomeMessage: {
    message: 'Welcome, {name}!',
    context: 'Greeting message shown to users when they log in',
  },
  errorTitle: {
    message: 'Error',
    context: 'Title for error dialogs',
  },
  successMessage: {
    message: 'Operation completed successfully',
    context: 'Generic success message',
  },
});
