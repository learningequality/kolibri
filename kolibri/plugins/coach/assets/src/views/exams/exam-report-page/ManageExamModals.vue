<template>

  <div>
    <preview-exam-modal
      v-if="examModalShown === ExamModals.PREVIEW_EXAM"
      :examQuestionSources="exam.question_sources"
      :examSeed="exam.seed"
      :examNumQuestions="exam.question_count"
    />

    <assignment-change-status-modal
      v-else-if="examModalShown === LessonActions.CHANGE_STATUS"
      :modalTitle="$tr('changeExamStatusTitle')"
      :modalDescription="$tr('changeExamStatusDescription')"
      :active="exam.active"
      @changeStatus="handleChangeStatus"
      @cancel="displayExamModal(null)"
    />

    <assignment-details-modal
      v-else-if="examModalShown === LessonActions.EDIT_DETAILS"
      :modalTitle="$tr('editExamDetails')"
      :submitErrorMessage="$tr('saveExamError')"
      :showDescriptionField="false"
      :isInEditMode="true"
      :initialTitle="exam.title"
      :initialSelectedCollectionIds="selectedCollectionIds"
      :classId="classId"
      :groups="learnerGroups"
      @save="updateExamDetails"
      @cancel="displayExamModal(null)"
    />

    <assignment-copy-modal
      v-else-if="examModalShown === LessonActions.COPY"
      :modalTitle="$tr('copyExamTitle')"
      :copyExplanation="$tr('copyExplanation')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @copy="copyExam"
      @cancel="displayExamModal(null)"
    />

    <assignment-delete-modal
      v-else-if="examModalShown === LessonActions.DELETE"
      :modalTitle="$tr('deleteExamTitle')"
      :modalDescription="$tr('deleteExamDescription', { title: exam.title })"
      @delete="deleteExam(exam.id)"
      @cancel="displayExamModal(null)"
    />
  </div>

</template>


<script>

  import AssignmentChangeStatusModal from '../../assignments/AssignmentChangeStatusModal';
  import previewExamModal from '../exams-page/preview-exam-modal';
  import AssignmentDetailsModal from '../../assignments/AssignmentDetailsModal';
  import AssignmentCopyModal from '../../assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../assignments/AssignmentDeleteModal';
  import { Modals as ExamModals } from '../../../examConstants';
  import { LessonActions } from '../../../lessonsConstants';
  import {
    displayExamModal,
    activateExam,
    deactivateExam,
    updateExamDetails,
    copyExam,
    deleteExam,
  } from '../../../state/actions/exam';

  export default {
    name: 'manageExamModals',
    components: {
      AssignmentChangeStatusModal,
      previewExamModal,
      AssignmentDetailsModal,
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    computed: {
      LessonActions() {
        return LessonActions;
      },
      ExamModals() {
        return ExamModals;
      },
      selectedCollectionIds() {
        return this.exam.assignments.map(assignment => assignment.collection.id);
      },
    },
    methods: {
      handleChangeStatus(isActive) {
        if (isActive === true) {
          this.activateExam(this.exam.id);
        } else if (isActive === false) {
          this.deactivateExam(this.exam.id);
        }
      },
    },
    vuex: {
      getters: {
        exam: state => state.pageState.exam,
        examModalShown: state => state.pageState.examModalShown,
        classId: state => state.classId,
        classList: state => state.classList,
        learnerGroups: state => state.pageState.learnerGroups,
      },
      actions: {
        displayExamModal,
        activateExam,
        deactivateExam,
        deleteExam,
        copyExam,
        updateExamDetails,
      },
    },
    $trs: {
      changeExamStatusTitle: 'Change exam status',
      changeExamStatusDescription: 'Learners can only see active exams',
      copyExamTitle: 'Copy exam',
      copyExplanation: 'Copy this exam to',
      assignmentQuestion: 'Who should this exam be assigned to?',
      deleteExamTitle: 'Delete exam',
      deleteExamDescription: "Are you sure you want to delete '{ title }'?",
      editExamDetails: 'Edit exam details',
      saveExamError: 'There was a problem saving this exam',
    },
  };

</script>


<style lang="stylus" scoped></style>
