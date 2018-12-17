<template>

  <div>
    <PreviewExamModal
      v-if="examsModalSet === ExamModals.PREVIEW_EXAM"
      :examQuestionSources="exam.question_sources"
      :examSeed="exam.seed"
      :examNumQuestions="exam.question_count"
      :exerciseContentNodes="exerciseContentNodes"
      @close="setExamsModal(null)"
    />

    <AssignmentChangeStatusModal
      v-else-if="examsModalSet === AssignmentActions.CHANGE_STATUS"
      :modalTitle="$tr('changeExamStatusTitle')"
      :modalDescription="$tr('changeExamStatusDescription')"
      :modalActiveOption="$tr('changeExamStatusActive')"
      :modalInactiveOption="$tr('changeExamStatusInactive')"
      :active="exam.active"
      @changeStatus="handleChangeStatus"
      @cancel="setExamsModal(null)"
    />

    <AssignmentDetailsModal
      v-else-if="examsModalSet === AssignmentActions.EDIT_DETAILS"
      ref="detailsModal"
      :modalTitle="$tr('editExamDetails')"
      :submitErrorMessage="$tr('saveExamError')"
      :showDescriptionField="false"
      :isInEditMode="true"
      :initialTitle="exam.title"
      :initialSelectedCollectionIds="selectedCollectionIds"
      :classId="classId"
      :groups="learnerGroups"
      @save="handleUpdateExamDetails"
      @cancel="setExamsModal(null)"
    />

    <AssignmentCopyModal
      v-else-if="examsModalSet === AssignmentActions.COPY"
      :modalTitle="$tr('copyExamTitle')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @copy="handleCopyExam"
      @cancel="setExamsModal(null)"
    />

    <AssignmentDeleteModal
      v-else-if="examsModalSet === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteExamTitle')"
      :modalDescription="$tr('deleteExamDescription', { title: exam.title })"
      :modalConfirmation="$tr('deleteExamConfirmation')"
      @delete="deleteExam(exam.id)"
      @cancel="setExamsModal(null)"
    />
  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import xorWith from 'lodash/xorWith';
  import AssignmentChangeStatusModal from '../../assignments/AssignmentChangeStatusModal';
  import PreviewExamModal from '../CoachExamsPage/PreviewExamModal';
  import AssignmentDetailsModal from '../../assignments/AssignmentDetailsModal';
  import AssignmentCopyModal from '../../assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../assignments/AssignmentDeleteModal';
  import { Modals as ExamModals } from '../../../constants/examConstants';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';

  export default {
    name: 'ManageExamModals',
    components: {
      AssignmentChangeStatusModal,
      PreviewExamModal,
      AssignmentDetailsModal,
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    computed: {
      ...mapState(['classId', 'className', 'classList']),
      ...mapState('examReport', ['exam', 'examsModalSet', 'learnerGroups', 'exerciseContentNodes']),
      AssignmentActions() {
        return AssignmentActions;
      },
      ExamModals() {
        return ExamModals;
      },
      selectedCollectionIds() {
        return this.exam.assignments.map(assignment => assignment.collection);
      },
    },
    methods: {
      ...mapActions('examReport', [
        'activateExam',
        'copyExam',
        'deactivateExam',
        'deleteExam',
        'setExamsModal',
        'updateExamDetails',
      ]),
      handleChangeStatus(isActive) {
        if (isActive === true) {
          this.activateExam(this.exam.id);
        } else if (isActive === false) {
          this.deactivateExam(this.exam.id);
        }
      },
      handleUpdateExamDetails(details) {
        const payload = {};
        const origAssignments = this.exam.assignments.map(assignment => ({
          collection: assignment.collection,
        }));

        if (
          xorWith(details.assignments, origAssignments, (a, b) => a.collection === b.collection)
            .length > 0
        ) {
          payload.assignments = details.assignments;
        }
        if (details.title !== this.exam.title) {
          payload.title = details.title;
        }
        if (payload === {}) {
          this.setExamsModal(null);
          return;
        }
        this.updateExamDetails({ examId: this.exam.id, payload })
          .then()
          .catch(() => this.$refs.detailsModal.handleSubmitFailure());
      },
      handleCopyExam(selectedClassroomId, selectedCollectionIds) {
        let title = this.$tr('copyOfExam', { examTitle: this.exam.title })
          .substring(0, 50)
          .trim();
        const exam = {
          collection: selectedClassroomId,
          channel_id: this.exam.channel_id,
          title,
          question_count: this.exam.question_count,
          question_sources: this.exam.question_sources,
          seed: this.exam.seed,
          assignments: selectedCollectionIds.map(id => ({ collection: id })),
        };
        this.copyExam({ exam, className: this.className });
      },
    },
    $trs: {
      changeExamStatusTitle: 'Change quiz status',
      changeExamStatusDescription: 'Learners can only see active quizzes',
      copyExamTitle: 'Copy quiz to',
      changeExamStatusActive: 'Active',
      changeExamStatusInactive: 'Inactive',
      assignmentQuestion: 'Assign quiz to',
      deleteExamTitle: 'Delete quiz',
      deleteExamDescription: "Are you sure you want to delete '{ title }'?",
      deleteExamConfirmation: 'All learner progress on this quiz will be lost.',
      editExamDetails: 'Edit quiz details',
      saveExamError: 'There was a problem saving this quiz',
      copyOfExam: 'Copy of { examTitle }',
    },
  };

</script>


<style lang="scss" scoped></style>
