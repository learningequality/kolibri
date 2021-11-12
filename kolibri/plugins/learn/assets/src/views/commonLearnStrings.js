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
      "The 'Library' section displays channels available on Kolibri server, and allows learners to browse, explore and filter topics and resources on their own.",
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
    context: "Heading in the 'Learn' section where users can view learning resources.\n",
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
      'Title of the modal window where a user will confirm or cancel marking a resource as complete manually.',
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
    context: 'Label indicating the resource contains several different learning activities.',
  },
});

export default {
  methods: {
    learnString(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};
