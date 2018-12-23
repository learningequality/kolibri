import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  cancelAction: 'Cancel',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  previewAction: 'Preview',
  saveAction: 'Save',

  // labels, phrases, titles, headers...
  avgQuizScoreLabel: 'Average quiz score',
  exercisesCompletedLabel: 'Exercises completed',
  groupsLabel: 'Groups',
  lessonsLabel: 'Lessons',
  lessonsAssignedLabel: 'Lessons assigned',
  lessonsCompletedLabel: 'Lessons completed',
  nameLabel: 'Name',
  needsHelpLabel: 'Needs help',
  orderFixedLabel: 'Fixed',
  orderFixedLabelLong: 'Fixed: each learner sees the same question order',
  orderFixedDescription: 'Each learner sees the same question order',
  orderRandomLabel: 'Randomized',
  orderRandomLabelLong: 'Randomized: each learner sees a different question order',
  orderRandomDescription: 'Each learner sees a different question order',
  overallLabel: 'Overall',
  previewLabel: 'Preview',
  progressLabel: 'Progress',
  quizzesLabel: 'Quizzes',
  quizzesAssignedLabel: 'Quizzes assigned',
  quizzesCompletedLabel: 'Quizzes completed',
  reportsLabel: 'Reports',
  resourcesViewedLabel: 'Resources viewed',
  scoreLabel: 'Score',
  titleLabel: 'Title',
  usernameLabel: 'Username',
  viewByGroupsLabel: 'View by groups',

  // formatted values
  integer: '{value, number, integer}',
  number: '{value, number}',
  numberOfGroups: '{value, number, integer} {value, plural, one {group} other {groups}}',
  numberOfQuestions: '{value} {value, plural, one {question} other {questions}}',
  percentage: '{value, number, percent}',
  ratio: '{value, number, integer} out of {total, number, integer}',
});

const coachStringsMixin = {
  computed: {
    coachStrings() {
      return coachStrings;
    },
  },
};

export { coachStrings, coachStringsMixin };
