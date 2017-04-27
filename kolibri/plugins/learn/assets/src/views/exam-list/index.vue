<template>

  <div>
    <div v-if="!isUserLoggedIn" class="login-message">
      <h1>{{ $tr('logInPrompt') }}</h1>
      <p>{{ $tr('logInCommand') }}</p>
    </div>

    <div v-else>
      <page-header :title="$tr('examName')"></page-header>
      <p class="exams-assigned">{{ $tr('assignedTo', { assigned: activeExams }) }}</p>
      <div class="exam-row" v-for="exam in exams">
        <mat-svg class="exam-icon" slot="content-icon" category="action" name="assignment"/>
        <h2 class="exam-title">{{ exam.title }}</h2>
        <div class="exam-details" v-if="exam.closed || !exam.active">
          <p class="answer-count">{{ $tr('howManyCorrect', { score: exam.score, outOf: exam.questionCount })}}</p>
          <div class="button-or-score">
            <b>{{ $tr('percentCorrect', { pct: exam.score/exam.questionCount })}}</b>
          </div>
        </div>
        <div class="exam-details" v-else>
          <p class="answer-count" v-if="exam.answerCount !== null">
            {{ $tr('questionsLeft', { left: exam.questionCount - exam.answerCount }) }}
          </p>
          <div class="button-or-score">
            <router-link :to="generateExamLink(exam)">
              <icon-button class="exam-button" :primary="true" v-if="exam.answerCount !== null" :text="$tr('continue')"></icon-button>
              <icon-button class="exam-button" :primary="true" v-if="exam.answerCount === null" :text="$tr('start')"></icon-button>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  const { isUserLoggedIn, getCurrentChannelObject } = require('kolibri.coreVue.vuex.getters');
  const PageNames = require('../../constants').PageNames;

  module.exports = {
    $trNameSpace: 'examIndex',
    $trs: {
      examName: 'Exams',
      howManyCorrect: '{ score, number }/{ outOf, number } correct',
      percentCorrect: '{pct, number, percent}',
      questionsLeft: '{ left, number } questions left',
      continue: 'Continue',
      start: 'Start',
      assignedTo: 'You have { assigned } {assigned, plural, one {exam} other {exams} } assigned',
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as a Learner to view this page.',
    },
    components: {
      'page-header': require('../page-header'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    computed: {
      activeExams() {
        return this.exams.filter(exam => !exam.closed || exam.active).length || 0;
      },
    },
    methods: {
      generateExamLink(exam) {
        return {
          name: PageNames.EXAM_ROOT,
          params: { channel_id: exam.channelId, id: exam.id },
        };
      },
    },
    vuex: {
      getters: {
        isUserLoggedIn,
        exams: state => state.pageState.exams,
        channelId: (state) => getCurrentChannelObject(state).id,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .login-message
    text-align: center
    margin-top: 200px

  .exams-assigned
    margin-top: 0

  .exam-row
    border-bottom: 1px solid #ccc
    padding: 20px 10px

  .exam-icon
    fill: $core-text-default
    position: relative
    top: 5px
    margin-right: 10px

  .exam-title
    display: inline-block

  .exam-details
    display: inline-block
    float: right

  .button-or-score
    width: 100px
    display: inline-block
    text-align: center
    margin-left: 80px

  .answer-count
    display: inline-block
    text-align: right

  .exam-button
    display: inline-block
    float: right
    position: relative
    top: 8px

</style>
