<template>

  <div class="page-status">
    <div class="column pure-u-3-4">
      <div class="user-name-container">
        <mat-svg
          class="svg-item"
          category="action"
          name="face"
        />
        <h1 class="user-name">{{ userName }}</h1>
      </div>
      <div class="class-name">
        <content-icon class="svg-icon" :kind="summaryLog.kind"/>
        {{ exerciseTitle }}
      </div>
      <div class="assessment">
        <progress-icon class="svg-icon" :progress="summaryLog.progress"/>
        {{ $tr('mastered') }}
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div class="inner-column">
        <progress-icon class="svg-icon" :progress="summaryLog.progress"/>
        <template v-if="isCompleted">
          <strong> {{ $tr('statusMastered') }} </strong>
          <p>{{ $tr('completedOn', {date:dateCompleted}) }}</p>
        </template>
        <template v-else>
          <strong> {{ $tr('statusAttempted') }} </strong>
          <p>{{ $tr('lastAttempted', {date:dateLastAttempted}) }}</p>
        </template>
      </div>
    </div>
  </div>

</template>


<script>

  const constants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'coachExercisePageStatus',
    $trs: {
      // TODO
      statusMastered: 'Mastered',
      statusAttempted: 'Attempted',
      mastered: 'Mastered questions TODO',
      completedOn: 'on { date }',
      lastAttempted: 'last on { date }',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
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
      channelId() {
        return '78eed5c0b59b30c0a40c94c17c849af6';
      },
      exerciseKind() {
        return constants.ContentNodeKinds.EXERCISE;
      },
      isCompleted() {
        return this.summaryLog.currentmasterylog.complete;
      },
      dateCompleted() {
        return new Date(this.summaryLog.currentmasterylog.end_timestamp);
      },
      dateLastAttempted() {
        return new Date(this.summaryLog.end_timestamp);
      },
    },
    methods: {
      assessmentText(text) {
        return this.$tr('assessment', { text });
      },
      dateText(date) {
        return this.$tr('date', { date });
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .page-status
    background-color: $core-bg-light
    height: 100%

  .user-name-container
    display: block

  .svg-icon
    font-size: 1.3em

  .class-name
    margin-top: 10px
    font-weight: bold

  .assessment
    margin-top: 10px

  .svg-item
    display: inline-block
    vertical-align: middle

  .user-name
    display: inline-block
    vertical-align: middle
    margin: 0

  .column
    float: left

  .inner-column
    float: right

</style>
