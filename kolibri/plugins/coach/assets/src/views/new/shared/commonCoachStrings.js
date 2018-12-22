import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  cancelAction: 'Cancel',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  previewAction: 'Preview',
  saveAction: 'Save',

  // labels, phrases, and titles
  orderFixedLabel: 'Fixed',
  orderFixedLabelLong: 'Fixed: each learner sees the same question order',
  orderFixedDescription: 'Each learner sees the same question order',
  orderRandomLabel: 'Randomized',
  orderRandomLabelLong: 'Randomized: each learner sees a different question order',
  orderRandomDescription: 'Each learner sees a different question order',
  previewLabel: 'Preview',

  // formatted values
  numberOfQuestions: '{num} {num, plural, one {question} other {questions}}',
});

const coachStringsMixin = {
  computed: {
    coachStrings() {
      return coachStrings;
    },
  },
};

export { coachStrings, coachStringsMixin };
