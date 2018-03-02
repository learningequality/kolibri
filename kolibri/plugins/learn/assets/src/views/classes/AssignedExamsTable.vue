<template>

  <div>
    <div class="header">
      <h2>{{ $tr('examsHeader') }}</h2>
      <p class="exams-assigned">
        <span v-if="numAssignedExams>0">
          {{ $tr('numberOfAssignedExams', { assigned: numAssignedExams }) }}
        </span>
        <span v-else>
          {{ $tr('noExams') }}
        </span>
      </p>
    </div>

    <core-table class="exams-table">
      <tbody slot="tbody">
        <tr v-for="exam in exams" :key="exam.id">
          <td class="core-table-icon-col">
            <content-icon :kind="EXAM" />
          </td>
          <td class="core-table-main-col title-col">
            {{ exam.title }}
          </td>

          <!-- When Exam is submitted -->
          <template v-if="exam.progress.closed || !exam.active">
            <td>
              <p>{{ howManyCorrectStr(exam) }}</p>
            </td>
            <td class="actions-col">
              <strong>
                {{ percentCorrectStr(exam) }}
              </strong>
            </td>
          </template>

          <!-- When Exam is still in progress or not started -->
          <template v-else>
            <td>
              <span v-if="userHasStartedExam(exam)">
                {{ questionsLeftStr(exam) }}
              </span>
            </td>
            <td class="actions-col">
              <k-router-link
                appearance="flat-button"
                :text="!userHasStartedExam(exam) ? $tr('start') : $tr('continue')"
                :to="examViewerLink(exam.id)"
                :primary="true"
              />
            </td>
          </template>
        </tr>
      </tbody>
    </core-table>
  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { examViewerLink } from './classPageLinks';

  export default {
    name: 'assignedExamsTable',
    components: {
      contentIcon,
      CoreTable,
      kRouterLink,
    },
    mixins: [responsiveWindow],
    props: {
      exams: {
        type: Array,
        required: true,
      },
    },
    computed: {
      EXAM() {
        return ContentNodeKinds.EXAM;
      },
      numAssignedExams() {
        return this.exams.filter(exam => !exam.progress.closed || exam.active).length;
      },
    },
    methods: {
      userHasStartedExam(exam) {
        return exam.progress.answer_count !== null;
      },
      // e.g. "7/10 Correct"
      howManyCorrectStr(exam) {
        return this.$tr('howManyCorrect', {
          score: exam.progress.score,
          outOf: exam.question_count,
        });
      },
      percentCorrectStr(exam) {
        return this.$tr('percentCorrect', { pct: exam.progress.score / exam.question_count });
      },
      // e.g. "14 questions left"
      questionsLeftStr(exam) {
        return this.$tr('questionsLeft', {
          left: exam.question_count - exam.progress.answer_count,
        });
      },
      examViewerLink,
    },
    $trs: {
      examsHeader: 'Exams',
      howManyCorrect: '{ score, number }/{ outOf, number } correct',
      percentCorrect: '{pct, number, percent}',
      questionsLeft: '{ left, number } questions left',
      continue: 'Continue',
      start: 'Start',
      noExams: 'You have no exams assigned',
      numberOfAssignedExams:
        'You have { assigned } {assigned, plural, one {exam} other {exams} } assigned',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exams-assigned
    margin-top: 0

  .title-col
    width: 50%

  .actions-col
    text-align: center

</style>
