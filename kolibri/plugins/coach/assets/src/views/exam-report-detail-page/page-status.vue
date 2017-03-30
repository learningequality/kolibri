<template>

  <div class="page-status">
    <div class="column pure-u-3-4">
      <div class="user-name-container">
        <mat-svg
          class="svg-item"
          category="action"
          name="face"
        />
        <h1 class="user-name">{{ $tr('title', {name: userName}) }}</h1>
      </div>
      <div class="questions">
        {{ $tr('overallScore') }} <strong> {{ $tr('score', {number: score}) }} </strong>
      </div>
      <div class="questions">
        {{ $tr('questionsCorrect') }} <strong> {{ questionsCorrectText(questions) }} </strong>
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div class="inner-column">
        <div>
          <progress-icon class="svg-icon" :progress="progress"/>
          <strong> {{ $tr('completed') }} </strong>
        </div>
        <p>{{ dateText(date) }}</p>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExamReportDetailPageStatus',
    $trs: {
      title: '{name} - Exam Performance',
      overallScore: 'Overall Score: ',
      score: '{ number }%',
      questionsCorrect: 'Questions Correct: ',
      correctQuestions: '{correct} of {total} correct',
      completed: 'Completed',
      date: 'on { date }',
    },
    components: {
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
    props: {
      userName: {
        type: String,
        required: true,
      },
      score: {
        type: Number,
        default: 0,
      },
      questions: {
        type: Array,
        default: [],
      },
      date: {
        type: String,
        default: false,
      },
    },
    methods: {
      questionsCorrectText(questions) {
        const correctQuestions = questions.filter((q) => q.correct);
        return this.$tr('correctQuestions', { correct: correctQuestions.length, total: questions.length });
      },
      dateText(date) {
        return this.$tr('date', { date });
      }
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        progress: () => 1,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .page-status
    background-color: $core-bg-light
    height: 130px

  .user-name-container
    display: block

  .svg-icon
    font-size: 1.3em

  .questions
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
