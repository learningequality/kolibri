<template>

  <div>

    <div class="header">
      <h1>
        {{ $tr('examTakenby', { num: takenBy }) }}
      </h1>
      <h1 v-if="takenBy > 0">
        {{ $tr('averageScore', { num: averageScore }) }}
      </h1>
    </div>

    <core-table v-if="!noExamData">
      <caption class="visuallyhidden">{{ $tr('examReport') }}</caption>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('name') }}</th>
          <th>{{ $tr('status') }}</th>
          <th>{{ $tr('score') }}</th>
          <th>{{ $tr('group') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr class="table-row" v-for="(examTaker, i) in examTakers" :key="i">
          <td class="core-table-icon-col">
            <content-icon :kind="USER" />
          </td>
          <td class="core-table-main-col">
            <k-router-link
              v-if="examTaker.progress !== undefined"
              :text="examTaker.name"
              :to="examDetailPageLink(examTaker.id)"
              class="table-name"
            />
            <span v-else class="table-name">
              {{ examTaker.name }}
            </span>
          </td>

          <td>
            <span v-if="(examTaker.progress === exam.question_count) || examTaker.closed">
              {{ $tr('completed') }}
            </span>
            <span v-else-if="examTaker.progress !== undefined">
              {{ $tr('remaining', { num: (exam.question_count - examTaker.progress) }) }}
            </span>
            <span v-else>
              {{ $tr('notstarted') }}
            </span>
          </td>

          <td>
            <span v-if="examTaker.score === undefined">–</span>
            <span v-else>
              {{ $tr('scorePercentage', { num: examTaker.score / exam.question_count }) }}
            </span>
          </td>

          <td>{{ examTaker.group.name || '–' }}</td>
        </tr>
      </tbody>
    </core-table>

    <p v-else>{{ $tr('noExamData') }}</p>

  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { PageNames } from '../../constants';
  import sumBy from 'lodash/sumBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import { USER } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'examReportPage',
    components: {
      contentIcon,
      CoreTable,
      kRouterLink,
    },
    computed: {
      noExamData() {
        return this.examTakers.length === 0;
      },
      USER() {
        return USER;
      },
      averageScore() {
        const totalScores = sumBy(this.examsInProgress, 'score');
        return totalScores / this.takenBy / this.exam.question_count;
      },
      examsInProgress() {
        return this.examTakers.filter(examTaker => examTaker.progress !== undefined);
      },
      takenBy() {
        return this.examsInProgress.length;
      },
    },
    methods: {
      examDetailPageLink(id) {
        return {
          name: PageNames.EXAM_REPORT_DETAIL_ROOT,
          params: {
            classId: this.classId,
            channelId: this.channelId,
            examId: this.exam.id,
            userId: id,
          },
        };
      },
    },
    vuex: {
      getters: {
        examTakers: state => state.pageState.examTakers,
        classId: state => state.classId,
        exam: state => state.pageState.exam,
        channelId: state => state.pageState.channelId,
      },
    },
    $trs: {
      examTakenby: 'Exam taken by: {num, plural, one {# learner} other {# learners}}',
      averageScore: 'Average score: {num, number, percent}',
      examReport: 'Exam report',
      completed: 'Completed',
      remaining: '{ num, number } {num, plural, one {question} other {questions}} remaining',
      notstarted: 'Not started',
      name: 'Name',
      status: 'Status',
      score: 'Score',
      scorePercentage: '{num, number, percent}',
      group: 'Group',
      noExamData: 'No data to show.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .header
    position: relative
    padding-right: 150px
    margin-bottom: 16px

</style>
