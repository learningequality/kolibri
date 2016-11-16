<template>

  <!--NOT STARTED-->
  <span v-if="isNotStarted" class="wrapper">
    <svg src="./progress-icons/notstarted.svg"></svg>
    <span v-if="showtext" class="text">
      <span v-if="isExercise">{{ $tr('notStarted') }}</span>
      <span v-if="isVideo">{{ $tr('notWatched') }}</span>
      <span v-if="isAudio">{{ $tr('notListened') }}</span>
      <span v-if="isDocument">{{ $tr('notViewed') }}</span>
    </span>
  </span>

  <!--IN PROGRESS-->
  <span v-if="isInProgress" class="wrapper">
    <svg src="./progress-icons/inprogress.svg"></svg>
    <span v-if="showtext" class="text">
      <span>{{ $tr('inProgress') }}</span>
    </span>
  </span>

  <!--COMPLETE-->
  <span v-if="isComplete" class="wrapper">
    <svg src="./progress-icons/complete.svg"></svg>
    <span v-if="showtext" class="text">
      <span v-if="isExercise">{{ $tr('mastered') }}</span>
      <span v-if="isVideo">{{ $tr('watched') }}</span>
      <span v-if="isAudio">{{ $tr('listened') }}</span>
      <span v-if="isDocument">{{ $tr('viewed') }}</span>
    </span>
  </span>

  <!--TODO: ADD VIEWED AND NOT VIEWED ICONS?-->

</template>


<script>

  const Constants = require('kolibri.coreVue.vuex.constants');
  const values = require('lodash.values');

  module.exports = {
    $trNameSpace: 'progress-icon',
    $trs: {
      started: 'Started',
      mastered: 'Mastered',
      watched: 'Watched',
      listened: 'Listened',
      viewed: 'Viewed',
      notStarted: 'Not Started',
      notMastered: 'Not Mastered',
      notWatched: 'Not Watched',
      notListened: 'Not Listened',
      notViewed: 'Not Viewed',
      inProgress: 'In Progress',
    },
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

  .wrapper
    position: relative

    svg
      position: absolute
      top: 50%
      bottom: 50%
      transform: translate(-50%, -50%)

    .text
      margin-left: 10px

</style>
