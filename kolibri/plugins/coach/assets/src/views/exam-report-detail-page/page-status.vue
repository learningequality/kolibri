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
      <div v-html="$trHtml('overallScore', {score: score})" class="questions">
      </div>
      <div
        v-html="$trHtml('questionsCorrect', { correct: questionsCorrect, total: questions.length })"
        class="questions">
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div class="inner-column">
        <progress-icon class="svg-icon" :progress="progress"/>
        <span v-if="completed">
          <strong> {{ $tr('completed') }} </strong>
          <br />
          <elapsed-time :date="completionTimestamp"/>
        </span>
        <span v-else-if="completed !== null">
          <strong> {{ $tr('inProgress') }} </strong>
        </span>
        <span v-else>
          <strong> {{ $tr('notStarted') }} </strong>
        </span>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExamReportDetailPageStatus',
    $trs: {
      title: '{name} - Exam Performance',
      overallScore: 'Overall Score: <strong>{ score, number, percent }</strong>',
      questionsCorrect: 'Questions Correct: <strong>{correct, number} of {total, number} correct</strong>',
      completed: 'Completed',
      inProgress: 'In progress',
      notStarted: 'Not started',
    },
    components: {
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
      'elapsed-time': require('kolibri.coreVue.components.elapsedTime'),
    },
    props: {
      userName: {
        type: String,
        required: true,
      },
      questions: {
        type: Array,
        default: [],
      },
      completed: {
        type: Boolean,
        default: false,
      },
      completionTimestamp: {
        type: Date,
      }
    },
    computed: {
      questionsCorrect() {
        return this.questions.reduce((a, q) => a + (q.correct === 1.0 ? 1 : 0), 0);
      },
      score() {
        return (this.questions.reduce((a, q) => a + q.correct, 0) / this.questions.length) || 0;
      },
      progress() {
        // Either return in completed or in progress
        return this.completed ? 1 : 0.1;
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
