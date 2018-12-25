import { createTranslator } from 'kolibri.utils.i18n';
import LabeledIcon from '../LabeledIcon';
import { statusStringsMixin } from './statusStrings';

export default {
  components: {
    LabeledIcon,
  },
  props: {
    count: {
      type: Number,
      default: 1,
    },
    total: {
      type: Number,
      default: 1,
    },
    verbosity: {
      type: Number,
      default: 0,
    },
    showRatio: {
      type: Boolean,
      default: true,
    },
    showNumber: {
      type: Boolean,
      default: true,
    },
  },
  mixins: [statusStringsMixin],
  computed: {
    text() {
      return '';
    },
  },
  methods: {
    stringId(variant) {
      return variant + this.$options.name;
    },
  },
};
