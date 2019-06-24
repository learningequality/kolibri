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
  renameAction: 'Rename',  
  showMoreAction: 'Show more',
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
  noResourcesInLessonLabel: 'No resources in this lesson',
  orderFixedLabel: 'Fixed',
  orderFixedDescription: 'Each learner sees the same question order',
  orderRandomLabel: 'Randomized',
  orderRandomDescription: 'Each learner sees a different question order',
  overallLabel: 'Overall',
  previewLabel: 'Preview',
  questionLabel: 'Question',
  questionOrderLabel: 'Question order',
  quizActiveLabel: 'Active',
  quizzesLabel: 'Quizzes',
  quizzesAssignedLabel: 'Quizzes assigned',
  recipientsLabel: 'Recipients',
  reportLabel: 'Report',
  reportsLabel: 'Reports',
  resourcesViewedLabel: 'Resources viewed',
  scoreLabel: 'Score',
  startedLabel: 'Started',
  statusLabel: 'Status',
  titleLabel: 'Title',
  timeSpentLabel: 'Time spent',
  ungroupedLearnersLabel: 'Ungrouped learners',  

  // notifications
  updatedNotification: 'Updated',
  createdNotification: 'Created',
  deletedNotification: 'Deleted',

  // empty states
  activityListEmptyState: 'There is no activity',
  groupListEmptyState: 'There are no groups',
  learnerListEmptyState: 'There are no learners',
  lessonListEmptyState: 'There are no lessons',
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
