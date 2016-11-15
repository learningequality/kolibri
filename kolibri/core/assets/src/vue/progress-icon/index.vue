<template>

  <!--NOT STARTED-->
  <div v-if="isNotStarted">
    <svg src="./progress-icons/notstarted.svg" class="progress-icon"></svg>
    <span v-if="showtext">
      <span v-if="is(Constants.ContentNodeKinds.EXERCISE)">Not Started</span>
      <span v-if="is(Constants.ContentNodeKinds.VIDEO)">Not Watched</span>
      <span v-if="is(Constants.ContentNodeKinds.AUDIO)">Not Listened</span>
      <span v-if="is(Constants.ContentNodeKinds.DOCUMENT)">Not Viewed</span>
    </span>
  </div>

  <!--IN PROGRESS-->
  <div v-if="isInProgress">
    <svg src="./progress-icons/inprogress.svg" class="progress-icon"></svg>
    <span v-if="showtext">
      <span>In Progress</span>
    </span>
  </div>

  <!--COMPLETE-->
  <div v-if="isComplete">
    <svg src="./progress-icons/complete.svg" class="progress-icon"></svg>
    <span v-if="showtext">
      <span v-if="is(Constants.ContentNodeKinds.EXERCISE)">Mastered</span>
      <span v-if="is(Constants.ContentNodeKinds.VIDEO)">Watched</span>
      <span v-if="is(Constants.ContentNodeKinds.AUDIO)">Listened</span>
      <span v-if="is(Constants.ContentNodeKinds.DOCUMENT)">Viewed</span>
    </span>
  </div>

  <!--TODO: ADD VIEWED AND NOT VIEWED-->

</template>


<script>

  const Constants = require('kolibri.coreVue.vuex.constants');
  const values = require('lodash.values');

  module.exports = {
    props: {
      progress: {
        type: Number,
        required: false,
        validator(value) {
          return (value >= 0) && (value <= 1);
        },
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          const validValues = values(Constants.ContentNodeKinds);
          validValues.push(Constants.USER);
          return validValues.includes(value);
        },
      },
      showtext: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      Constants() {
        return Constants;
      },
      isNotStarted() {
        return this.progress === 0 || this.progress === undefined;
      },
      isInProgress() {
        return (this.progress > 0) && (this.progress < 1);
      },
      isComplete() {
        return this.progress === 1;
      },
    },
    methods: {
      is(kind) {
        return this.kind === kind;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .content-icon
    width: 100%
    height: 100%

  .color-action
    fill: $core-action-normal

  .color-text-default
    fill: $core-text-default

</style>
