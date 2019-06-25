import { createTranslator } from 'kolibri.utils.i18n';

const learnStrings = createTranslator('CommonLearnStrings', {
  // Labels
  learnLabel: 'Learn',
  recommendedLabel: 'Recommended',
  resumeLabel: 'Resume',
});

const learnStringsMixin = {
  methods: {
    learnCommon$tr(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};

export { learnStrings, learnStringsMixin };
