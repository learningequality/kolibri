import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  cancelAction: 'Cancel',
  editDetailsAction: 'Edit details',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  manageResourcesAction: 'Manage resources',
  previewAction: 'Preview',
  saveAction: 'Save',

  // labels, phrases, titles, headers...
  activityLabel: 'Activity',
  answersLabel: 'Answers',
  answerHistoryLabel: 'Answer history',
  attemptsLabel: 'Attempts',
  avgScoreLabel: 'Average score',
  avgTimeSpentLabel: 'Average time spent',
  avgQuizScoreLabel: 'Average quiz score',
  classesLabel: 'Classes',
  completedLabel: 'Completed',
  coachesLabel: 'Coaches',
  descriptionLabel: 'Description',
  difficultQuestionsLabel: 'Difficult questions',
  exercisesCompletedLabel: 'Exercises completed',
  groupsLabel: 'Groups',
  helpNeededLabel: 'Help needed',
  lastActivityLabel: 'Last activity',
  learnersLabel: 'Learners',
  lessonsLabel: 'Lessons',
  lessonsAssignedLabel: 'Lessons assigned',
  lessonsCompletedLabel: 'Lessons completed',
  masteryModelLabel: 'Completion requirement',
  nameLabel: 'Name',
  needsHelpLabel: 'Needs help',
  optionsLabel: 'Options',
  orderFixedLabel: 'Fixed',
  orderFixedLabelLong: 'Fixed: each learner sees the same question order',
  orderFixedDescription: 'Each learner sees the same question order',
  orderRandomLabel: 'Randomized',
  orderRandomLabelLong: 'Randomized: each learner sees a different question order',
  orderRandomDescription: 'Each learner sees a different question order',
  overallLabel: 'Overall',
  previewLabel: 'Preview',
  progressLabel: 'Progress',
  questionLabel: 'Question',
  questionOrderLabel: 'Question order',
  quizzesLabel: 'Quizzes',
  quizzesAssignedLabel: 'Quizzes assigned',
  quizzesCompletedLabel: 'Quizzes completed',
  recipientsLabel: 'Recipients',
  reportLabel: 'Report',
  reportsLabel: 'Reports',
  resourcesViewedLabel: 'Resources viewed',
  scoreLabel: 'Score',
  statusLabel: 'Status',
  titleLabel: 'Title',
  timeSpentLabel: 'Time spent',
  usernameLabel: 'Username',
  viewsLabel: 'Views',

  // toggles
  showCorrectAnswerLabel: 'Show correct answer',
  viewByGroupsLabel: 'View by groups',

  // formatted values
  integer: '{value, number, integer}',
  number: '{value, number}',
  numberOfClasses: '{value, number, integer} {value, plural, one {class} other {classes}}',
  numberOfCoaches: '{value, number, integer} {value, plural, one {coach} other {coaches}}',
  numberOfGroups: '{value, number, integer} {value, plural, one {group} other {groups}}',
  numberOfLearners: '{value, number, integer} {value, plural, one {learner} other {learners}}',
  numberOfQuestions: '{value, number, integer} {value, plural, one {question} other {questions}}',
  numberOfResources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
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
