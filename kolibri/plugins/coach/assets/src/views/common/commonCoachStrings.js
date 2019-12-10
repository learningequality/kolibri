import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  copyAction: 'Copy',
  exportCSVAction: 'Export as CSV',
  manageResourcesAction: 'Manage resources',
  newLessonAction: 'New lesson',
  newQuizAction: 'New quiz',
  previewAction: 'Preview',
  printReportAction: 'Print report',
  renameAction: 'Rename',
  viewAllAction: 'View all',
  showMoreAction: 'Show more',

  // labels, phrases, titles, headers...
  activeLabel: 'Active',
  activeQuizzesLabel: 'Active quizzes',
  activityLabel: 'Activity',
  allQuizzesLabel: 'All quizzes',
  avgScoreLabel: 'Average score',
  avgTimeSpentLabel: 'Average time spent',
  avgQuizScoreLabel: 'Average quiz score',
  backToLessonLabel: "Back to '{lesson}'",
  classLabel: 'Class',
  classesLabel: 'Classes', // Kept for use in common.js
  coachLabel: 'Coach', // Kept here for use in common.js
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
  inactiveLabel: 'Inactive',
  learnersLabel: 'Learners', // Kept here for use in common.js
  lessonLabel: 'Lesson',
  lessonsLabel: 'Lessons', // Kept here for use in common.js
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
  questionsLabel: 'Questions', // Kept here for use in common.js
  questionOrderLabel: 'Question order',
  quizClosedLabel: {
    message: 'Quiz ended',
    context:
      'A label indicating that the currently viewed quiz is ended - meaning that learners will no longer be able to give answers to the quiz.',
  },
  quizzesLabel: 'Quizzes', // Kept here for use in common.js
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
  viewByGroupsLabel: 'View by groups',

  // formatted values
  integer: '{value, number, integer}',
  nthExerciseName: '{name} ({number, number, integer})',
  numberOfLearners: '{value, number, integer} {value, plural, one {learner} other {learners}}',
  numberOfQuestions: '{value, number, integer} {value, plural, one {question} other {questions}}',
  numberOfResources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
  percentage: '{value, number, percent}',
  ratioShort: '{value, number, integer} of {total, number, integer}',

  // Errors
  quizDuplicateTitleError: 'A quiz with that name already exists',
  lessonDuplicateTitleError: 'A lesson with this name already exists',

  // Quiz activation / closing / etc
  reportVisibleLabel: {
    message: 'Report visible',
    context:
      'A label used on a switch indicating that the learners can see their reports when the switch is turned "on"',
  },
  quizOpenedMessage: {
    message: 'Quiz started',
    context: 'A brief snackbar message notifying the user that the quiz was successfully started.',
  },
  quizFailedToOpenMessage: {
    message: 'There was a problem starting the quiz. The quiz was not started.',
    context:
      'A brief snackbar message notifying the user that there was an error trying to start the quiz and that the quiz was not started.',
  },
  quizClosedMessage: {
    message: 'Quiz ended',
    context: 'A brief snackbar message notifying the user that the quiz was successfully ended.',
  },
  quizFailedToCloseMessage: {
    message: 'There was a problem ending the quiz. The quiz was not ended.',
    context:
      'A brief snackbar message notifying the user that there was an error trying to end the quiz and that the quiz was not ended.',
  },
  quizVisibleToLearners: {
    message: 'Quiz report is visible to learners',
    context:
      'A brief snackbar message notifying the user that learners may view their quiz report. It will show when the user changes a setting to make the quiz visible.',
  },
  quizNotVisibleToLearners: {
    message: 'Quiz report is not visible to learners',
    context:
      'A brief snackbar message notifying the user that learners may no longer view their quiz report. It will show when the user changes a setting to make the quiz no longer visible.',
  },
  openQuizLabel: {
    message: 'Start quiz',
    context:
      "Label for a button that, when clicked, will 'start' a quiz - making it active so that Learners may take the quiz.",
  },
  openQuizModalDetail: {
    message:
      'Starting the quiz will make it visible to learners and they will be able to answer questions',
    context:
      "Text shown on a modal pop-up window when the user clicks the 'Start Quiz' button. This explains what will happen when the user confirms the action of starting the quiz.",
  },
  closeQuizLabel: {
    message: 'End quiz',
    context:
      "Label for a button that, when clicked, will 'end' a quiz. This makes the quiz inactive and Learners will no longer be able to give answers.",
  },
  closeQuizModalDetail: {
    message:
      'All learners will be given a final score and a quiz report. Unfinished questions will be counted as incorrect.',
    context:
      "Text shown on a modal pop-up window when the user clicks the 'End Quiz' button. This explains what will happen when the modal window is confirmed.",
  },
  lessonNotVisibleToLearnersLabel: {
    message: 'Lesson is not visible to learners',
    context:
      'Snackbar message telling the user that the lesson is now not visible to learners. This will display whenever the user changes the lesson from visible to not visible.',
  },
  lessonVisibleToLearnersLabel: {
    message: 'Lesson is visible to learners',
    context:
      'Snackbar message telling the user that the lesson is now visible to learners. This will display whenever the user changes the lesson from not visible to visible.',
  },
});

const coachStringsMixin = {
  methods: {
    coachString(key, args) {
      return coachStrings.$tr(key, args);
    },
  },
};

export { coachStrings, coachStringsMixin };
