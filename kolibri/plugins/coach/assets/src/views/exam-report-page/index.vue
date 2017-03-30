<template>

  <div>

    <div class="header">
      <h1>
        {{ $tr('examTakenby', { number: 40 }) }}
      </h1>
      <h1>
        {{ $tr('averageScore', { number: averageScore }) }}
      </h1>
    </div>

    <div class="table-wrapper" v-if="!noExamData">
      <table class="roster">
        <caption class="visuallyhidden">{{$tr('examReport')}}</caption>
        <thead class="table-header">
          <tr>
            <th scope="col" class="table-text">{{ $tr('name') }}</th>
            <th scope="col" class="table-data">{{ $tr('status') }}</th>
            <th scope="col" class="table-data">{{ $tr('score') }}</th>
            <th scope="col" class="table-data">{{ $tr('group') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="table-row" v-for="examTaker in examTakers">
            <th scope="row" class="table-text">
              <router-link :to="examDetailPageLink(examTaker.id)" class="table-name">
                {{examTaker.name}}
              </router-link>
            </th>
            <td class="table-data" v-if="examTaker.progress">{{ $tr('completed') }}</td>
            <td class="table-data incomplete" v-else>{{ $tr('Incomplete') }}</td>
            <td class="table-data">{{ $tr('scorePercentage', { number: examTaker.score }) }}</td>
            <td class="table-data">{{ examTaker.group }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else>{{ $tr('noExamData') }}</p>

  </div>

</template>


<script>

  const constants = require('../../constants');
  const actions = require('../../state/actions/main');

  module.exports = {
    computed: {
      noExamData() {
        return this.examTakers.length === 0;
      },
      averageScore() {
        return Math.round(this.examTakers.reduce((acc, examTaker) => acc + examTaker.score, 0)
          / this.examTakers.length);
      },
    },
    methods: {
      examDetailPageLink(id) {
        return {
          name: constants.PageNames.EXAM_REPORT_DETAIL,
          params: { classId: 2, examId: 1, userId: id },
        };
      },
    },
    vuex: {
      getters: {
        examTakers: () => [
          {
            id: 1,
            name: 'LearnerName 111',
            progress: 0,
            score: null,
            group: 'Group A',
          },
          {
            id: 2,
            name: 'LearnerName 222',
            progress: 1,
            score: 33,
            group: 'Group A',
          },
          {
            id: 3,
            name: 'LearnerName 333',
            progress: 0,
            score: null,
            group: 'Group B',
          }
        ],
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
    $trNameSpace: 'examReportPage',
    $trs: {
      examTakenby: 'Exam taken by: {number} Learners',
      averageScore: 'Average Score: {number}%',
      examReport: 'Exam report',
      completed: 'Completed',
      Incomplete: 'Incomplete',
      name: 'Name',
      status: 'Status',
      score: 'Score',
      scorePercentage: '{number, select, null {-} other {{number}%}}',
      group: 'Group',
      noExamData: 'No data to show.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .roster
    width: 100%
    border-spacing: 8px
    border-collapse: collapse

  .table-wrapper
    overflow-x: auto

  thead th
    color: $core-text-annotation
    font-size: smaller
    font-weight: normal

  .table-row
    height: 40px
    border-bottom: 2px solid $core-text-disabled

  .table-text
    text-align: left

  .table-data
    text-align: center

  .incomplete
    color: red

  .header
    position: relative
    padding-right: 150px
    margin-bottom: 16px

</style>
