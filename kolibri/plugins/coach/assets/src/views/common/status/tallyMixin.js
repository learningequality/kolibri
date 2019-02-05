export default {
  props: {
    // Every learner should be tallied into _one and only_ one status
    tally: {
      type: Object,
      required: true,
      validator(value) {
        return (
          Number.isInteger(value.started) &&
          Number.isInteger(value.notStarted) &&
          Number.isInteger(value.completed) &&
          Number.isInteger(value.helpNeeded)
        );
      },
    },
  },
  computed: {
    started() {
      return this.tally.started;
    },
    completed() {
      return this.tally.completed;
    },
    helpNeeded() {
      return this.tally.helpNeeded;
    },
    notStarted() {
      return this.tally.notStarted;
    },
    total() {
      return this.started + this.completed + this.notStarted + this.helpNeeded;
    },
  },
};
