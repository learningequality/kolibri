<template>

  <div>
    <h1>{{ currentClass.name }} {{ $tr('exams') }}</h1>
    <ui-radio-group
      :name="$tr('examFilter')"
      :label="$tr('show')"
      :options="filterOptions"
      v-model="filterSelected"
      class="radio-group"
    />
    <ui-button
      type="primary"
      color="primary"
      :raised="true"
      icon="add"
      class="create-button"
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
          :examVisibility="exam.visibility"
          :classId="currentClass.id"
          :className="currentClass.name"
          :classGroups="[]"
          @changeExamVisibility="openChangeExamVisibilityModal"
          @activateExam="openActivateExamModal"
          @deactivateExam="openDeactivateExamModal"
          @previewExam="openPreviewExamModal"
          @viewReport="routeToExamReport"
          @renameExam="openRenameExamModal"
          @deleteExam="openDeleteExamModal"
        />
      </tbody>
    </table>
    <p v-else class="center-text"><strong>{{ $tr('noExams') }}</strong></p>
    <create-exam-modal
      v-if="showCreateExamModal"
      :classId="currentClass.id"
      :channels="channels"
    />
    <activate-exam-modal
      v-if="showActivateExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :examVisibility="selectedExam.visibility"
      :classId="currentClass.id"
    />
    <deactivate-exam-modal
      v-if="showDeactivateExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :examVisibility="selectedExam.visibility"
      :classId="currentClass.id"
    />
    <change-exam-visibility-modal
      v-if="showChangeExamVisibilityModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :examVisibility="selectedExam.visibility"
      :classId="currentClass.id"
      :className="currentClass.name"
      :classGroups="currentClassGroups"
    />
    <preview-exam-modal
      v-if="showPreviewExamModal"
      :exam="selectedExam"
    />
    <rename-exam-modal
      v-if="showRenameExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :classId="currentClass.id"
    />
    <delete-exam-modal
      v-if="showDeleteExamModal"
      :examId="selectedExam.id"
      :examTitle="selectedExam.title"
      :classId="currentClass.id"
    />
  </div>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');
  const ExamModals = require('../../examConstants').Modals;
  const PageNames = require('../../constants').PageNames;

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
      'create-exam-modal': require('./create-exam-modal'),
      'activate-exam-modal': require('./activate-exam-modal'),
      'deactivate-exam-modal': require('./deactivate-exam-modal'),
      'change-exam-visibility-modal': require('./change-exam-visibility-modal'),
      'preview-exam-modal': require('./preview-exam-modal'),
      'rename-exam-modal': require('./rename-exam-modal'),
      'delete-exam-modal': require('./delete-exam-modal'),
    },
    data() {
      return {
        filterSelected: this.$tr('all'),
        selectedExam: { title: '', id: '', visibility: { class: null, groups: [] } },
      };
    },
    computed: {
      filterOptions() {
        return [
          { label: this.$tr('all'), value: this.$tr('all') },
          { label: this.$tr('active'), value: this.$tr('active') },
          { label: this.$tr('inactive'), value: this.$tr('inactive') }
        ];
      },

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
      showCreateExamModal() {
        return this.examModalShown === ExamModals.CREATE_EXAM;
      },
      showActivateExamModal() {
        return this.examModalShown === ExamModals.ACTIVATE_EXAM;
      },
      showDeactivateExamModal() {
        return this.examModalShown === ExamModals.DEACTIVATE_EXAM;
      },
      showChangeExamVisibilityModal() {
        return this.examModalShown === ExamModals.CHANGE_EXAM_VISIBILITY;
      },
      showPreviewExamModal() {
        return this.examModalShown === ExamModals.PREVIEW_EXAM;
      },
      showRenameExamModal() {
        return this.examModalShown === ExamModals.RENAME_EXAM;
      },
      showDeleteExamModal() {
        return this.examModalShown === ExamModals.DELETE_EXAM;
      },
    },
    methods: {
      setSelectedExam(examId) {
        Object.assign(this.selectedExam, this.exams.find(exam => exam.id === examId));
      },
      openCreateExamModal() {
        this.displayExamModal(ExamModals.CREATE_EXAM);
      },
      openChangeExamVisibilityModal(examId) {
        this.setSelectedExam(examId);
        this.displayExamModal(ExamModals.CHANGE_EXAM_VISIBILITY);
      },
      openActivateExamModal(examId) {
        this.setSelectedExam(examId);
        this.displayExamModal(ExamModals.ACTIVATE_EXAM);
      },
      openDeactivateExamModal(examId) {
        this.setSelectedExam(examId);
        this.displayExamModal(ExamModals.DEACTIVATE_EXAM);
      },
      openPreviewExamModal(examId) {
        this.setSelectedExam(examId);
        this.displayExamModal(ExamModals.PREVIEW_EXAM);
      },
      routeToExamReport(examId) {
        this.$router.push({
          name: PageNames.EXAM_REPORT,
          params: { classId: this.currentClass.id, examId }
        });
      },
      openRenameExamModal(examId) {
        this.setSelectedExam(examId);
        this.displayExamModal(ExamModals.RENAME_EXAM);
      },
      openDeleteExamModal(examId) {
        this.setSelectedExam(examId);
        this.displayExamModal(ExamModals.DELETE_EXAM);
      },
    },
    vuex: {
      actions: {
        displayExamModal: ExamActions.displayExamModal,
      },
      getters: {
        currentClass: state => state.pageState.currentClass,
        currentClassGroups: state => state.pageState.currentClassGroups,
        exams: state => state.pageState.exams,
        channels: state => state.pageState.channels,
        examModalShown: state => state.pageState.examModalShown,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .create-button
    float: right
    margin-top: 1em
    margin-bottom: 1em

  .center-text
    text-align: center

  .radio-group
    display: inline-block

  table
    margin-top: 3em

</style>
