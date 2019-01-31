export default {
  props: {
    // Every learner should be tallied into _one and only_ one status
    tallyObject: {
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
      // To the user, all these are considered having 'started'
      return this.tallyObject.started + this.tallyObject.helpNeeded;
    },
    completed() {
      return this.tallyObject.completed;
    },
    helpNeeded() {
      return this.tallyObject.helpNeeded;
    },
    notStarted() {
      return this.tallyObject.notStarted;
    },
    total() {
      return this.started + this.tallyObject.completed + this.notStarted;
    },
  },
};
