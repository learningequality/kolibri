import { createTranslator } from 'kolibri/utils/i18n';

export const picturePasswordStrings = createTranslator('PicturePasswordStrings', {
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
  picturePasswordLabel: {
    message: 'Picture password',
    context: 'Column header label for the picture password column in the learner list',
  },
});
