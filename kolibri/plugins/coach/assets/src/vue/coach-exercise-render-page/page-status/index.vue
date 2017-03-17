<template>

  <div id="page-status">
    <div class="column pure-u-3-4">
      <div id="user-name-container">
        <mat-svg
          id="svg-item"
          category="action"
          name="face"
        />
        <h1 id="user-name">{{ userName }}</h1>
      </div>
      <div id="class-name">
        <content-icon class="svg-icon" :kind="exerciseKind"/>
        {{ contentName }}
      </div>
      <div id="assessment">
        <progress-icon class="svg-icon" :progress="progress"/>
        {{ $tr('mastered') }} : {{ assessmentText(assessment) }}
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div id="inner-column">
        <progress-icon class="svg-icon" :progress="progress"/>
        <strong> {{ $tr('mastered') }} </strong>
        <br>
        <br>
        {{ dateText(date) }}
      </div>
    </div>
  </div>

</template>


<script>

  const constants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'CoachExercisePageStatus',
    $trs: {
      assessment: '{ text } questions in a row correct - Today',
      mastered: 'Mastered',
      date: 'on { date }',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
    props: {
      contentName: {
        type: String,
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      progress: {
        type: Number,
        default: 0,
      },
      assessment: {
        type: String,
        default: '',
      },
      date: {
        type: String,
        default: false,
      },
    },
    computed: {
      channelId() {
        return '78eed5c0b59b30c0a40c94c17c849af6';
      },
      exerciseKind() {
        return constants.ContentNodeKinds.EXERCISE;
      }
    },
    methods: {
      assessmentText(text) {
        return this.$tr('assessment', { text });
      },
      dateText(date) {
        return this.$tr('date', { date });
      }
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  #page-status
    background-color: $core-bg-light

  #user-name-container
    display: block

  .svg-icon
    font-size: 1.3em

  #class-name
    margin-top: 10px
    font-weight: bold

  #assessment
    margin-top: 10px

  #svg-item
    display: inline-block
    vertical-align: middle

  #user-name
    display: inline-block
    vertical-align: middle
    margin: 0

  .column
    float: left

  #inner-column
    float: right

</style>
