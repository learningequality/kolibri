import { FLAT_BUTTON, RAISED_BUTTON, BASIC_LINK } from './appearances.js';

export default {
  computed: {
    buttonClasses() {
      if (this.appearance === BASIC_LINK) {
        return 'link';
      } else if (this.primary && this.appearance === RAISED_BUTTON) {
        return ['button', 'primary', 'raised'];
      } else if (this.primary && this.appearance === FLAT_BUTTON) {
        return ['button', 'primary', 'flat'];
      } else if (!this.primary && this.appearance === RAISED_BUTTON) {
        return ['button', 'secondary', 'raised'];
      } else if (!this.primary && this.appearance === FLAT_BUTTON) {
        return ['button', 'secondary', 'flat'];
      }
    },
  },
};
