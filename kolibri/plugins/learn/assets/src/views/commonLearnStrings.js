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
  // Learning Activities
  all: {
    message: 'All',
    context: 'A label for everything in the group of activities',
  },
  watch: {
    message: 'Watch',
    context:
      'Resource and filter label for the type of learning activity with video. Translate as a VERB',
  },
  create: {
    message: 'Create',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  read: {
    message: 'Read',
    context:
      'Resource and filter label for the type of learning activity with documents. Translate as a VERB',
  },
  practice: {
    message: 'Practice',
    context:
      'Resource and filter label for the type of learning activity with questions and answers. Translate as a VERB',
  },
  reflect: {
    message: 'Reflect',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  listen: {
    message: 'Listen',
    context:
      'Resource and filter label for the type of learning activity with audio. Translate as a VERB',
  },
  interact: {
    message: 'Explore',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
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
});

export default {
  methods: {
    learnString(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};
