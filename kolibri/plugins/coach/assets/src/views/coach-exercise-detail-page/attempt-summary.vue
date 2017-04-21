<template>

  <div class="attempt-summary">
    <div class="column pure-u-3-4">
      <div class="user-name-container">
        <mat-svg
          class="svg-item"
          category="action"
          name="face"
        />
        <h1 class="user-name">{{ userName }}</h1>
      </div>
      <div class="exercise-name">
        <content-icon class="svg-icon" :kind="summaryLog.kind"/>
        {{ exerciseTitle }}
      </div>
      <div :class="{'in-progress': !isCompleted, 'assessment': true}" >
        <progress-icon class="svg-icon" :progress="summaryLog.progress"/>
        {{ $tr('mastered') }}
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div class="status">
        <progress-icon class="svg-icon" :progress="summaryLog.progress"/>
        <span v-if="isCompleted">
          <strong> {{ $tr('statusMastered') }} </strong>
          <br />
          <elapsed-time :date="dateCompleted"/>
        </span>
        <span v-else>
          <strong> {{ $tr('statusInProgress') }} </strong>
          <br />
          <elapsed-time :date="dateLastAttempted"/>
        </span>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExercisePageStatus',
    $trs: {
      statusMastered: 'Mastered',
      statusInProgress: 'In Progress',
      mastered: 'Mastered questions TODO',
      attemptDateIndicator: 'on { date }',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
      'elapsed-time': require('kolibri.coreVue.components.elapsedTime'),
    },
    props: {
      userName: {
        type: String,
        required: true,
      },
      exerciseTitle: {
        type: String,
        required: true,
      },
      summaryLog: {
        type: Object,
        required: true,
        // validate: TODO
      },
    },
    computed: {
      isCompleted() {
        return this.summaryLog.currentmasterylog.complete;
      },
      dateCompleted() {
        return new Date(this.summaryLog.currentmasterylog.end_timestamp).toLocaleDateString();
      },
      dateLastAttempted() {
        return new Date(this.summaryLog.end_timestamp);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .attempt-summary
    background-color: $core-bg-light
    height: 100%

  .user-name-container
    display: block

  .svg-icon
    font-size: 1.3em

  .exercise-name
    margin-top: 10px
    font-weight: bold

  .assessment
    margin-top: 10px

  .in-progress
    color: #ADADAD

  .svg-item
    display: inline-block
    vertical-align: middle

  .user-name
    display: inline-block
    vertical-align: middle
    margin: 0

  .column
    float: left

  .status
    float: right
    text-align: right

</style>
