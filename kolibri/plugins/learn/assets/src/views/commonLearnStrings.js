import { createTranslator } from 'kolibri.utils.i18n';

const learnStrings = createTranslator('CommonLearnStrings', {
  // Labels
  classesLabel: 'Classes',
  channelsLabel: 'Channels',
  recommendedLabel: 'Recommended',

});

const learnStringsMixin = {
  methods: {
    coachCommon$tr(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};

export { learnStrings, learnStringsMixin };
