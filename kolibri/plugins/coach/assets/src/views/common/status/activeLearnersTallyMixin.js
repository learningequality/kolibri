export default {
  props: {
    // Every learner should be tallied into _one and only_ one status
    tally: {
      type: Object,
      required: true,
      validator(value) {
        return Number.isInteger(value.active) && Number.isInteger(value.notActive);
      },
    },
  },
  computed: {
    active() {
      return this.tally.active;
    },
    notActive() {
      return this.tally.notActive;
    },
    total() {
      return this.active + this.notActive;
    },
  },
};
