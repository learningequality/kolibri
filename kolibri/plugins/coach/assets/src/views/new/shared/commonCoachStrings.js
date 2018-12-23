import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  cancelAction: 'Cancel',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  previewAction: 'Preview',
  saveAction: 'Save',

  // Toggles
  viewByGroupsToggle: 'View by groups',

  // labels, phrases, titles, headers...
  avgQuizScoreLabel: 'Average quiz score',
  exercisesCompletedLabel: 'Exercises completed',
  groupsLabel: 'Groups',
  lessonsAssignedLabel: 'Lessons assigned',
  nameLabel: 'Name',
  orderFixedLabel: 'Fixed',
  orderFixedLabelLong: 'Fixed: each learner sees the same question order',
  orderFixedDescription: 'Each learner sees the same question order',
  orderRandomLabel: 'Randomized',
  orderRandomLabelLong: 'Randomized: each learner sees a different question order',
  orderRandomDescription: 'Each learner sees a different question order',
  overallLabel: 'Overall',
  previewLabel: 'Preview',
  resourcesViewedLabel: 'Resources viewed',

  // formatted values
  number: '{value, number}',
  integer: '{value, number, integer}',
  percentage: '{value, number, percent}',
  numberOfQuestions: '{value} {value, plural, one {question} other {questions}}',
});

const coachStringsMixin = {
  computed: {
    coachStrings() {
      return coachStrings;
    },
  },
};

export { coachStrings, coachStringsMixin };
