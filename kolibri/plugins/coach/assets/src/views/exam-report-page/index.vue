<template>

  <div>

    <div class="header">
      <h1>
        {{ $tr('examTakenby', { number: 40 }) }}
      </h1>
      <h1>
        {{ $tr('averageScore') }} {{ averageScore }}%
      </h1>
    </div>

    <!-- <class-delete-modal
      v-if="showDeleteClassModal"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
    /> -->

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
          <tr v-for="examTaker in examTakers">
            <th scope="row" class="table-text">
              <router-link :to="learnerExamLink(examTaker.id)" class="table-name">
                {{examTaker.name}}
              </router-link>
            </th>
            <td class="table-data">{{ examTaker.progress }}</td>
            <td class="table-data">{{ examTaker.score }}%</td>
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
    // components: {
    //   'class-delete-modal': require('./class-delete-modal'),
    // },
    // Has to be a funcion due to vue's treatment of data
    // data: () => ({
    //   currentClassDelete: null,
    // }),
    computed: {
      // showDeleteClassModal() {
      //   return this.modalShown === constants.Modals.DELETE_CLASS;
      // },
      noExamData() {
        return this.examTakers.length === 0;
      },
      averageScore() {
        return Math.round(this.examTakers.reduce((acc, examTaker) => acc + examTaker.score, 0)
          / this.examTakers.length);
      },
    },
    methods: {
      learnerExamLink(id) {
        return {
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          params: { id },
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
            score: 99,
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
            score: 77,
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
      averageScore: 'Average Score: ',
      examReport: 'Exam report',
      name: 'Name',
      status: 'Status',
      score: 'Score',
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
    border-collapse: separate

  .table-wrapper
    overflow-x: auto

  thead th
    color: $core-text-annotation
    font-size: smaller
    font-weight: normal

  .table-text
    text-align: left

  .table-data
    text-align: center

  .header
    position: relative
    padding-right: 150px
    margin-bottom: 16px

</style>
