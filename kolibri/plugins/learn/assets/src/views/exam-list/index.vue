<template>

  <div>
    <auth-message v-if="!isUserLoggedIn" authorizedRole="learner" />

    <div v-else>
      <page-header :title="$tr('examName')" />
      <p v-if="activeExams" class="exams-assigned">{{ $tr('assignedTo', { assigned: activeExams }) }}</p>
      <p v-else class="exams-assigned">{{ $tr('noExams') }}</p>

      <div class="pure-g exam-row" v-for="exam in exams" :key="exam.id">

        <div class="exam-row-1st-col" :class="firstColClass">
          <mat-svg class="exam-icon" slot="content-icon" category="action" name="assignment_late" />
          <h2 class="exam-title">{{ exam.title }}</h2>
        </div>

        <template v-if="exam.closed || !exam.active">
          <div class="exam-row-2nd-col" :class="secondColClass">
            <p>{{ $tr('howManyCorrect', { score: exam.score, outOf: exam.questionCount }) }}</p>
          </div>
          <div class="exam-row-3rd-col" :class="thirdColClass">
            <p><strong>{{ $tr('percentCorrect', { pct: exam.score/exam.questionCount }) }}</strong></p>
          </div>
        </template>

        <template v-else>
          <div class="exam-row-2nd-col" :class="secondColClass">
            <p v-if="exam.answerCount !== null">
              {{ $tr('questionsLeft', { left: exam.questionCount - exam.answerCount }) }}
            </p>
          </div>
          <div class="exam-row-3rd-col" :class="thirdColClass">
            <k-router-link
              appearance="flat-button"
              :text="exam.answerCount === null ? $tr('start') : $tr('continue')"
              :to="generateExamLink(exam)"
              :primary="true"
            />
          </div>
        </template>

      </div>

    </div>
  </div>

</template>


<script>

  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../../constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import pageHeader from '../page-header';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'examIndex',
    components: {
      authMessage,
      pageHeader,
      kRouterLink,
    },
    mixins: [responsiveWindow],
    $trs: {
      examName: 'Exams',
      howManyCorrect: '{ score, number }/{ outOf, number } correct',
      percentCorrect: '{pct, number, percent}',
      questionsLeft: '{ left, number } questions left',
      continue: 'Continue',
      start: 'Start',
      noExams: 'You have no exams assigned',
      assignedTo: 'You have { assigned } {assigned, plural, one {exam} other {exams} } assigned',
    },
    computed: {
      activeExams() {
        return this.exams.filter(exam => !exam.closed || exam.active).length || 0;
      },
      firstColClass() {
        const bp = this.windowSize.breakpoint;
        if (bp < 2) {
          return 'pure-u-1-1';
        } else if (bp === 2) {
          return 'pure-u-1-2';
        }
        return 'pure-u-3-5';
      },
      secondColClass() {
        const bp = this.windowSize.breakpoint;
        if (bp < 2) {
          return 'pure-u-1-2';
        } else if (bp === 2) {
          return 'pure-u-1-4';
        }
        return 'pure-u-1-5';
      },
      thirdColClass() {
        return this.secondColClass;
      },
    },
    methods: {
      generateExamLink(exam) {
        return {
          name: PageNames.EXAM,
          params: {
            channel_id: exam.channelId,
            id: exam.id,
            questionNumber: 0,
          },
        };
      },
    },
    vuex: {
      getters: {
        isUserLoggedIn,
        exams: state => state.pageState.exams,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exams-assigned
    margin-top: 0

  .exam-row
    border-bottom: 1px solid $core-grey

  .exam-title
    display: inline-block

  .exam-icon
    position: relative
    top: 5px
    margin-right: 8px
    fill: $core-text-default

  .exam-row-2nd-col, .exam-row-3rd-col
    text-align: center

  h2, p
    margin-top: 16px
    margin-bottom: 16px

</style>
