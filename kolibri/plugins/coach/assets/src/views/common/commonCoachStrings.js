import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  copyAction: 'Copy',
  editDetailsAction: 'Edit details',
  finishAction: 'Finish',
  goBackAction: 'Go back',
  manageResourcesAction: 'Manage resources',
  newLessonAction: 'New lesson',
  newQuizAction: 'New quiz',
  previewAction: 'Preview',
  saveAction: 'Save',
  saveChangesAction: 'Save changes',
  renameAction: 'Rename',
  showAction: 'Show',
  showMoreAction: 'Show more',
  sortedAscendingAction: 'Sort in ascending order',
  sortedDescendingAction: 'Sort in descending order',
  viewAllAction: 'View all',

  // labels, phrases, titles, headers...
  activeQuizzesLabel: 'Active quizzes',
  activityLabel: 'Activity',
  allQuizzesLabel: 'All quizzes',
  avgScoreLabel: 'Average score',
  avgTimeSpentLabel: 'Average time spent',
  avgQuizScoreLabel: 'Average quiz score',
  descriptionLabel: 'Description',
  descriptionMissingLabel: 'No description',
  detailsLabel: 'Details',
  difficultQuestionsLabel: 'Difficult questions',
  entireClassLabel: 'Entire class',
  exercisesCompletedLabel: 'Exercises completed',
  groupNameLabel: 'Group name',
  groupsLabel: 'Groups',
  helpNeededLabel: 'Help needed',
  inactiveQuizzesLabel: 'Inactive quizzes',
  lastActivityLabel: 'Last activity',
  lessonActiveLabel: 'Active',
  inactiveLabel: 'Inactive',
  lessonsLabel: 'Lessons',
  lessonsAssignedLabel: 'Lessons assigned',
  masteryModelLabel: 'Completion requirement',
  membersLabel: 'Members',
  nameLabel: 'Name',
  orderFixedLabel: 'Fixed',
  orderFixedDescription: 'Each learner sees the same question order',
  orderRandomLabel: 'Randomized',
  orderRandomDescription: 'Each learner sees a different question order',
  overallLabel: 'Overall',
  previewLabel: 'Preview',
  questionLabel: 'Question',
  questionOrderLabel: 'Question order',
  questionsLabel: 'Questions',
  quizLabel: 'Quiz',
  quizActiveLabel: 'Active',
  quizScoreLabel: 'Quiz score',
  quizzesLabel: 'Quizzes',
  quizzesAssignedLabel: 'Quizzes assigned',
  quizzesCompletedLabel: 'Quizzes completed',
  recipientLabel: 'Recipient',
  recipientsLabel: 'Recipients',
  reportLabel: 'Report',
  reportsLabel: 'Reports',
  resourceTitleLabel: 'Resource title',
  resourcesViewedLabel: 'Resources viewed',
  scoreLabel: 'Score',
  sortedAscendingLabel: '(sorted ascending)',
  sortedDescendingLabel: '(sorted descending)',
  startedLabel: 'Started',
  statusLabel: 'Status',
  titleLabel: 'Title',
  timeLabel: 'Time',
  timeSpentLabel: 'Time spent',
  ungroupedLearnersLabel: 'Ungrouped learners',
  usernameLabel: 'Username',
  viewsLabel: 'Views',

  // notifications
  updatedNotification: 'Updated',
  createdNotification: 'Created',
  deletedNotification: 'Deleted',
  savedNotification: 'Saved',

  // empty states
  activityListEmptyState: 'There is no activity',
  groupListEmptyState: 'There are no groups',
  learnerListEmptyState: 'There are no learners',
  lessonListEmptyState: 'There are no lessons',
  recentActivityListEmptyState: 'There is no recent activity',
  questionListEmptyState: 'There are no questions',
  quizListEmptyState: 'There are no quizzes',

  // toggles
  showCorrectAnswerLabel: 'Show correct answer',
  viewByGroupsLabel: 'View by groups',

  // formatted values
  integer: '{value, number, integer}',
  nthExerciseName: '{name} ({number, number, integer})',
  number: '{value, number}',
  numberOfClasses: '{value, number, integer} {value, plural, one {class} other {classes}}',
  numberOfCoaches: '{value, number, integer} {value, plural, one {coach} other {coaches}}',
  numberOfGroups: '{value, number, integer} {value, plural, one {group} other {groups}}',
  numberOfLearners: '{value, number, integer} {value, plural, one {learner} other {learners}}',
  numberOfQuestions: '{value, number, integer} {value, plural, one {question} other {questions}}',
  numberOfResources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
  numberOfViews: '{value, number, integer} {value, plural, one {view} other {views}}',
  percentage: '{value, number, percent}',
  ratio: '{value, number, integer} out of {total, number, integer}',
  ratioShort: '{value, number, integer} of {total, number, integer}',

  // Errors
  quizDuplicateTitleError: 'A quiz with that name already exists',
  lessonDuplicateTitleError: 'A lesson with this name already exists',
});

const coachStringsMixin = {
  methods: {
    coachCommon$tr(key, args) {
      return coachStrings.$tr(key, args);
    },
  },
};

export { coachStrings, coachStringsMixin };
