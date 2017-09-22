export default {
  computed: {
    buttonClasses() {
      if (this.appearance === 'link') {
        return 'link';
      } else if (this.primary && this.appearance === 'raised') {
        return ['button', 'primary', 'raised'];
      } else if (this.primary && this.appearance === 'flat') {
        return ['button', 'primary', 'flat'];
      } else if (!this.primary && this.appearance === 'raised') {
        return ['button', 'secondary', 'raised'];
      } else if (!this.primary && this.appearance === 'flat') {
        return ['button', 'secondary', 'flat'];
      }
    },
  },
};
