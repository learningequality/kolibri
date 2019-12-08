import { crossComponentTranslator } from 'kolibri.utils.i18n';
import LearnIndex from './LearnIndex';

const learnIndexStrings = crossComponentTranslator(LearnIndex);

export default {
  methods: {
    learnIndexString(key) {
      return learnIndexStrings.$tr(key);
    },
  },
};
