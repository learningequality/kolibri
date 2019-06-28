import { createTranslator } from 'kolibri.utils.i18n';

export const learnStrings = createTranslator('CommonLearnStrings', {
  // Labels
  learnLabel: 'Learn',
  recommendedLabel: 'Recommended',
});

export default {
  methods: {
    learnString(key, args) {
      return learnStrings.$tr(key, args);
    },
  },
};
