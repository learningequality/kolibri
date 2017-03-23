<template>

  <div>
    <h1>{{ currentClass.name }} {{ $tr('exams') }}</h1>
    <ui-radio-group
      :name="$tr('examFilter')"
      :label="$tr('show')"
      v-model="filterSelected"
      :options="filterOptions"
    />
    <ui-button
      type="primary"
      color="primary"
      :raised="true"
      icon="add"
      @click="openCreateExamModal">
      {{ $tr('newExam') }}
    </ui-button>
    <table v-if="exams.length">
      <thead>
        <tr>
          <th class="col-icon"></th>
          <th class="col-title">{{ $tr('title') }}</th>
          <th class="col-visibility">{{ $tr('visibleTo') }}</th>
          <th class="col-action">{{ $tr('action') }}</th>
        </tr>
      </thead>
      <tbody>
        <exam-row
          v-for="exam in filteredExams"
          :active="exam.active"
          :dateCreated="exam.dateCreated"
          :title="exam.title"
          :visibleTo="exam.visibleTo"
          :className="currentClass.name"
          :classId="currentClass.id"
          :classGroups="[]"
        />
      </tbody>
    </table>
    <p v-else class="center-text"><strong>{{ $tr('noExams') }}</strong></p>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExamsPage',
    $trs: {
      exams: 'Exams',
      show: 'Show',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      examFilter: 'Exam filter',
      newExam: 'New Exam',
      title: 'Title',
      visibleTo: 'Visible to',
      action: 'Action',
      noExams: `You do not have any exams. Start by creating a new exam above.`,
    },
    components: {
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-radio-group': require('keen-ui/src/UiRadioGroup'),
      'exam-row': require('./exam-row'),
    },
    data() {
      return {
        filterSelected: this.$tr('all'),
        filterOptions: [
          { label: this.$tr('all'), value: this.$tr('all') },
          { label: this.$tr('active'), value: this.$tr('active') },
          { label: this.$tr('inactive'), value: this.$tr('inactive') }
        ],
      };
    },
    computed: {
      activeExams() {
        return this.exams.filter(exam => exam.active === true);
      },
      inactiveExams() {
        return this.exams.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.filterSelected;
        if (filter === this.$tr('active')) {
          return this.activeExams;
        } else if (filter === this.$tr('inactive')) {
          return this.inactiveExams;
        }
        return this.exams;
      }
    },
    methods: {
      openCreateExamModal() {
        console.log('openCreateExamModal');
      },
    },
    vuex: {
      getters: {
        currentClass: state => state.pageState.currentClass,
        classes: state => state.pageState.classes,
        currentChannel: state => state.pageState.currentChannel,
        channels: state => state.pageState.channels,
        exams: state => state.pageState.exams,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .center-text
    text-align: center

</style>
