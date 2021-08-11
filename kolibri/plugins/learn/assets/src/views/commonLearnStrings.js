import { createTranslator } from 'kolibri.utils.i18n';

export const learnStrings = createTranslator('CommonLearnStrings', {
  // Labels
  learnLabel: {
    message: 'Learn',
    context:
      "Each time a learner signs in to Kolibri, the first thing they see is the  'Learn' page with the list of all the classes they are enrolled to.",
  },
  recommendedLabel: {
    message: 'Recommended',
    context:
      "The 'Recommended' section shows learning topics and materials that are either related to what the learner was doing the last time they used Kolibri, or recommended by their coaches.",
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
    context: 'Label for links that go to the most popular content',
  },
  nextStepsLabel: {
    message: 'Next steps',
    context: 'Label for links that go to post-requisites for content that has been completed',
  },
});

export default {
  methods: {
    learnString(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};
