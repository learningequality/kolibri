<template>

  <!--NOT STARTED-->
  <span v-if="isNotStarted">
    <svg src="./progress-icons/notstarted.svg"></svg>
    <span v-if="showtext">
      <span v-if="isExercise">Not Started</span>
      <span v-if="isVideo">Not Watched</span>
      <span v-if="isAudio">Not Listened</span>
      <span v-if="isDocument">Not Viewed</span>
    </span>
  </span>

  <!--IN PROGRESS-->
  <span v-if="isInProgress">
    <svg src="./progress-icons/inprogress.svg"></svg>
    <span v-if="showtext">
      <span>In Progress</span>
    </span>
  </span>

  <!--COMPLETE-->
  <span v-if="isComplete">
    <svg src="./progress-icons/complete.svg"></svg>
    <span v-if="showtext">
      <span v-if="isExercise">Mastered</span>
      <span v-if="isVideo">Watched</span>
      <span v-if="isAudio">Listened</span>
      <span v-if="isDocument">Viewed</span>
    </span>
  </span>

  <!--TODO: ADD VIEWED AND NOT VIEWED ICONS?-->

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
      isExercise() {
        return this.is(Constants.ContentNodeKinds.EXERCISE);
      },
      isVideo() {
        return this.is(Constants.ContentNodeKinds.VIDEO);
      },
      isAudio() {
        return this.is(Constants.ContentNodeKinds.AUDIO);
      },
      isDocument() {
        return this.is(Constants.ContentNodeKinds.DOCUMENT);
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

</style>
