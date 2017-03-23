<template>

  <div>
    <h1>{{ currentClass.name }} {{ $tr('exams') }}</h1>
    <ui-radio-group
      :name="$tr('examFilter')"
      :label="$tr('show')"
      :options="filterOptions"
      v-model="filterSelected"
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
          :examId="exam.id"
          :examTitle="exam.title"
          :examActive="exam.active"
          :examDate="exam.dateCreated"
          :examVisibility="exam.visibility"
          :classId="currentClass.id"
          :className="currentClass.name"
          :classGroups="[]"
          @changeExamVisibility="openChangeExamVisibilityModal"
          @activateExam="openActivateExamModal"
          @deactivateExam="openDeactivateExamModal"
          @previewExam="openPreviewExamModal"
          @viewReport="openViewReportModal"
          @renameExam="openRenameExamModal"
          @deleteExam="openDeleteExamModal"
        />
      </tbody>
    </table>
    <p v-else class="center-text"><strong>{{ $tr('noExams') }}</strong></p>
    <activate-exam-modal
      v-if="showActivateExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :examVisibility="selectedExam.visibility"
      :classId="currentClass.id"/>
  </div>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');
  const ExamModals = require('../../constants').ExamModals;

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
      'activate-exam-modal': require('./activate-exam-modal'),
    },
    data() {
      return {
        filterSelected: this.$tr('all'),
        filterOptions: [
          { label: this.$tr('all'), value: this.$tr('all') },
          { label: this.$tr('active'), value: this.$tr('active') },
          { label: this.$tr('inactive'), value: this.$tr('inactive') }
        ],
        selectedExam: { title: '', id: '', visibility: { class: true } },
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
      },
      showActivateExamModal() {
        return this.modalShown === ExamModals.ACTIVATE_EXAM;
      },
    },
    methods: {
      openCreateExamModal() {
        console.log('openCreateExamModal');
      },
      openChangeExamVisibilityModal() {
        console.log('openChangeExamVisibilityModal');
      },
      openActivateExamModal(examId, examTitle, examVisibility) {
        this.selectedExam.id = examId;
        this.selectedExam.title = examTitle;
        this.selectedExam.visibility = examVisibility;
        this.displayModal(ExamModals.ACTIVATE_EXAM);
      },
      openDeactivateExamModal() {
        console.log('openDeactivateExamModal');
      },
      openPreviewExamModal() {
        console.log('openPreviewExamModal');
      },
      openViewReportModal() {
        console.log('openViewReportModal');
      },
      openRenameExamModal() {
        console.log('openRenameExamModal');
      },
      openDeleteExamModal() {
        console.log('openDeleteExamModal');
      },
    },
    vuex: {
      actions: {
        displayModal: ExamActions.displayModal,
      },
      getters: {
        currentClass: state => state.pageState.currentClass,
        classes: state => state.pageState.classes,
        currentChannel: state => state.pageState.currentChannel,
        channels: state => state.pageState.channels,
        exams: state => state.pageState.exams,
        modalShown: state => state.pageState.modalShown,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .center-text
    text-align: center

</style>
