import { createTranslator } from 'kolibri.utils.i18n';

export const learnStrings = createTranslator('CommonLearnStrings', {
  // Labels
  learnLabel: {
    message: 'Learn',
    context:
      "Each time a learner signs in to Kolibri, the first thing they see is the  'Learn' page with the list of all the classes they are enrolled to.",
  },
  libraryLabel: {
    message: 'Library',
    context:
      "The 'Library' section shows learning topics and materials that are either related to what the learner was doing the last time they used Kolibri, or recommended by their coaches. It also allows learners to browse and explore content on their own.",
  },
  resumeLabel: {
    message: 'Resume',
    context: 'Label for links that go to content that has been started and can be resumed',
  },
  mostPopularLabel: {
    message: 'Most popular',
    context: 'Label for links that go to the most popular content',
  },
  popularLabel: {
    message: 'Popular',
    context: 'Label for links that go to the most popular content.',
  },
  nextStepsLabel: {
    message: 'Next steps',
    context: 'Label for links that go to post-requisites for content that has been completed.',
  },
  multipleLearningActivitiesLabel: {
    message: 'Multiple learning activities',
    context: '',
  },
  exploreResources: {
    message: 'Explore resources',
  },
  logo: {
    message: 'From the channel {channelTitle}',
    context:
      'Added to create a complete alt-text description of a logo on a content card to indicate to the user what channel the resource belongs to. For example: From the channel Khan Academy - English',
  },
  resourceCompletedLabel: {
    message: 'Resource completed',
    context:
      'Message when the user successfully finishes a resource or marks a resource as complete',
  },
  dontShowThisAgainLabel: {
    message: 'Don’t show this again',
    context:
      'Option that allows the user to prevent this resource from displaying in the future while using category search',
  },
  markResourceAsCompleteLabel: {
    message: 'Mark resource as complete',
    context:
      'Title of the modal window where a user will confirm or cancel marking a resource as complete manually',
  },
  resourceHidden: {
    message: 'Resource hidden',
    context:
      'Notification message indicating the resource has been marked as hidden for future category searches.',
  },
  suggestedTimeToComplete: {
    message: 'Suggested time to complete',
    context: 'Tooltip label indicating the approximate time needed to complete the resource.',
  },
  multipleLearningActivities: {
    message: 'Multiple learning activities',
    context: 'Label indicating the resource contains multiple learning activities',
  },

  // TODO - move these into diff sections as we make this a full feature in 0.16
  // Past Papers Project (12/2021) strings
  quizLabel: {
    message: 'Quiz',
    context: 'Label to show that the practice resource can be interacted with as a quiz.',
  },
  suggestedTime: {
    message: 'Suggested Time',
    context: 'Time suggested by coach for how long an independent practice quiz should take',
  },
  practiceQuizReportTitle: {
    message: 'Report for [Quiz title]', //!!FIXME
    context: 'Title of the independent practice quiz',
  },
  practiceAgainButton: {
    message: 'PRACTICE AGAIN',
    context: 'Label to retake or retry the same independent practice quiz again',
  },
  statusLabel: {
    message: 'Status',
    context:
      'In a learner\'s independent practice quiz report, tells whether the practice quiz is "In progress" or "Completed"',
  },
  timeSpentLabel: {
    message: 'Time spent',
    context: 'Indicates the time a learner has spent on a specific learning resource.',
  },
  attemptedLabel: {
    message: 'Attempted',
    context:
      'A number (time) that indicates the when the learner last took this independent practice quiz',
  },
  bestScoreLabel: {
    message: 'Best score',
    context:
      'When there have been multiple attempts on a practice quiz, tells learner the percentage of their highest score',
  },
  bestScoreTimeLabel: {
    message: 'Best score time',
    context:
      'When there have been multiple attempts on a practice quiz, tells learner the length of time taken for the attempt with the highest score',
  },
  attemptDropdownLabel: {
    message: 'Attempt',
    context:
      'Label for the dropdown to choose one of their five most recent attempts at the practice quiz',
  },
  recentAttemptsLabel: {
    message: '(XX%) X minutes/days/weeks/months ago', //!Fix me
    context:
      'Label that describes the percent correct, and the amount of time that has passed since the that attempt',
  },
  answerLogCorrectLabel: {
    message: 'You answered this correctly on the last attempt',
    context:
      'Label that tells learner they answered the question correctly the last time they took the practice quiz',
  },
  answerLogIncorrectLabel: {
    message: 'You also answered this incorrectly on the last attempt',
    context:
      'Label that tells learner they answered this question incorrectly this attempt and also the attempt before this',
  },
  answerLogImprovedLabel: {
    message: 'You improved your incorrect answer on the last attempt',
    context:
      'Label that tells learner they got the question wrong the last time, but got it correctly on this attempt',
  },
  practiceQuizReportImprovedLabel: {
    message: 'You improved at Z questions', //!Fix me
    context:
      'Describes to learner how many questions the answered correctly compared to the most recent attempt', //? Unclear
  },
  practiceQuizReportFasterSuggestedLabel: {
    message: 'Y minutes faster than the suggested time', //!Fix me
    context: 'Describes to learner how many minutes faster they were than the suggested time',
  },
  practiceQuizReportSlowerSuggestedLabel: {
    message: 'Y minutes slower than the suggested time', //!Fix me
    context: 'Describes to learner how many minutes slower they were than the suggested time',
  },
  practiceQuizReportFasterTimeLabel: {
    message: 'Y minutes faster than last time', //!Fix me
    context:
      'Describes to learner how many minutes faster they were during this attempt than the last attempt',
  },
  practiceQuizReportSlowerTimeLabel: {
    message: 'Y minutes slower than last time', //!Fix me
    context:
      'Describes to learner how many minutes slower they were during this attempt than the last attemptz',
  },
});

export default {
  methods: {
    learnString(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};
