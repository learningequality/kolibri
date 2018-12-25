import { createTranslator } from 'kolibri.utils.i18n';
import LabeledIcon from '../LabeledIcon';

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
  computed: {
    text() {
      if (!this.showNumber) {
        if (this.verbosity === 0) {
          return '';
        }
        return this.$tr(this.stringId('basicLabel'), { count: this.count });
      }
      if (this.verbosity === 0) {
        if (this.showRatio) {
          return this.$tr(this.stringId('ratioShort'), {
            count: this.count,
            total: this.total,
          });
        }
        return this.$tr(this.stringId('countShort'), {
          count: this.count,
          total: this.total,
        });
      }
      if (this.showRatio) {
        if (this.count === this.total && this.count != 1) {
          return this.$tr(this.stringId('all'), {
            count: this.count,
            total: this.total,
          });
        }
        return this.$tr(this.stringId('ratio'), {
          count: this.count,
          total: this.total,
        });
      }
      return this.$tr(this.stringId('count'), { count: this.count, total: this.total });
    },
  },
  methods: {
    stringId(variant) {
      return variant + this.$options.name;
    },
  },
};
