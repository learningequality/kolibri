<template>

  <!--NOT STARTED-->
  <span v-if="isNotStarted" class="wrapper notstarted">
    <svg src="./progress-icons/notstarted.svg"></svg>
    <span v-if="showtext" class="text">
      <span v-if="isExercise">{{ $tr('notStarted') }}</span>
      <span v-else-if="isVideo">{{ $tr('notWatched') }}</span>
      <span v-else-if="isAudio">{{ $tr('notListened') }}</span>
      <span v-else-if="isDocument">{{ $tr('notViewed') }}</span>
    </span>
  </span>

  <!--IN PROGRESS-->
  <span v-else-if="isInProgress" class="wrapper inprogress">
    <svg src="./progress-icons/inprogress.svg"></svg>
    <span v-if="showtext" class="text">
      <span>{{ $tr('inProgress') }}</span>
    </span>
  </span>

  <!--COMPLETE-->
  <span v-else-if="isComplete" class="wrapper complete">
    <svg src="./progress-icons/complete.svg"></svg>
    <span v-if="showtext" class="text">
      <span v-if="isExercise">{{ $tr('mastered') }}</span>
      <span v-else-if="isVideo">{{ $tr('watched') }}</span>
      <span v-else-if="isAudio">{{ $tr('listened') }}</span>
      <span v-else-if="isDocument">{{ $tr('viewed') }}</span>
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
    display: inline-block
    width: inherit
    height: inherit
    border-radius: 1em
    background-color: white
    text-align: center

  svg
    vertical-align: middle
    width: 75%
    height: 75%

  .notstarted
    background-color: $core-text-annotation
    svg
      fill: white

  .inprogress
    background-color: $core-text-warning
    svg
      fill: white

  .complete
    background-color: $core-text-success
    svg
      fill: white

  .text
    margin-left: 15px

</style>
