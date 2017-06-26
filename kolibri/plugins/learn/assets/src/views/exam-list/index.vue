<template>

  <div>
    <auth-message v-if="!isUserLoggedIn" authorizedRole="learner" />

    <div v-else>
      <page-header :title="$tr('examName')"></page-header>
      <p v-if="activeExams" class="exams-assigned">{{ $tr('assignedTo', { assigned: activeExams }) }}</p>
      <p v-else class="exams-assigned">{{ $tr('noExams') }}</p>
      <div class="exam-row" v-for="exam in exams">
        <mat-svg class="exam-icon" slot="content-icon" category="action" name="assignment_late"/>
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

  import {
    isUserLoggedIn,
    getCurrentChannelObject
  } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import pageHeader from '../page-header';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    $trNameSpace: 'examIndex',
    $trs: {
      examName: 'Exams',
      howManyCorrect: '{ score, number }/{ outOf, number } correct',
      percentCorrect: '{pct, number, percent}',
      questionsLeft: '{ left, number } questions left',
      continue: 'Continue',
      start: 'Start',
      noExams: 'You have no exams assigned',
      assignedTo: 'You have { assigned } {assigned, plural, one {exam} other {exams} } assigned'
    },
    components: {
      authMessage,
      pageHeader,
      iconButton
    },
    computed: {
      activeExams() {
        return this.exams.filter(exam => !exam.closed || exam.active).length || 0;
      }
    },
    methods: {
      generateExamLink(exam) {
        return {
          name: PageNames.EXAM_ROOT,
          params: {
            channel_id: exam.channelId,
            id: exam.id
          }
        };
      }
    },
    vuex: {
      getters: {
        isUserLoggedIn,
        exams: state => state.pageState.exams,
        channelId: state => getCurrentChannelObject(state).id
      }
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

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
