export default {
  props: {
    // Every learner should be tallied into _one and only_ one status
    tally: {
      type: Object,
      required: true,
      validator(value) {
        const hasBasicFields =
          Number.isInteger(value.started) &&
          Number.isInteger(value.notStarted) &&
          Number.isInteger(value.completed) &&
          Number.isInteger(value.helpNeeded);

        // Pre-test and post-test fields are optional (for courses)
        const hasOptionalTestFields =
          value.preTestRunning === undefined || Number.isInteger(value.preTestRunning);
        const hasOptionalPostTestFields =
          value.postTestRunning === undefined || Number.isInteger(value.postTestRunning);

        return hasBasicFields && hasOptionalTestFields && hasOptionalPostTestFields;
      },
    },
    // Optional: Pass progress data with unit information for test states
    progress: {
      type: Object,
      default: null,
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
      return this.tally.notStarted || 0;
    },
    preTestRunning() {
      return this.tally.preTestRunning || 0;
    },
    postTestRunning() {
      return this.tally.postTestRunning || 0;
    },
    total() {
      return (
        this.started +
        this.completed +
        this.notStarted +
        this.helpNeeded +
        this.preTestRunning +
        this.postTestRunning
      );
    },
    // Get the unit name if available from progress data
    unitName() {
      return this.progress?.unitName || null;
    },
  },
};
