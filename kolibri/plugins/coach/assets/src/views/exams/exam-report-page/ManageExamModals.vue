<template>

  <div>
    <preview-exam-modal
      v-if="examModalShown === ExamModals.PREVIEW_EXAM"
      :examQuestionSources="exam.question_sources"
      :examSeed="exam.seed"
      :examNumQuestions="exam.question_count"
    />

    <assignment-change-status-modal
      v-if="examModalShown === LessonActions.CHANGE_STATUS"
      :title="$tr('changeExamStatusTitle')"
      :description="$tr('changeExamStatusDescription')"
      :active="exam.active"
      @changeStatus="handleChangeStatus"
      @cancel="displayExamModal(null)"
    />

    <assignment-delete-modal
      v-if="examModalShown === LessonActions.DELETE"
      :title="$tr('deleteExamTitle')"
      :description="$tr('deleteExamDescription', { title: exam.title })"
      @delete="deleteExam(exam.id)"
      @cancel="displayExamModal(null)"
    />
  </div>

</template>


<script>

  import AssignmentChangeStatusModal from '../../assignments/AssignmentChangeStatusModal';
  import previewExamModal from '../exams-page/preview-exam-modal';
  import AssignmentDeleteModal from '../../assignments/AssignmentDeleteModal';
  import { Modals as ExamModals } from '../../../examConstants';
  import { LessonActions } from '../../../lessonsConstants';
  import {
    displayExamModal,
    activateExam,
    deactivateExam,
    deleteExam,
  } from '../../../state/actions/exam';

  export default {
    name: 'manageLessonModels',
    components: {
      AssignmentChangeStatusModal,
      previewExamModal,
      AssignmentDeleteModal,
    },
    computed: {
      LessonActions() {
        return LessonActions;
      },
      ExamModals() {
        return ExamModals;
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
      },
      actions: {
        displayExamModal,
        activateExam,
        deactivateExam,
        deleteExam,
      },
    },
    $trs: {
      changeExamStatusTitle: 'Change exam status',
      changeExamStatusDescription: 'Learners can only see active exams',
      deleteExamTitle: 'Delete exam',
      deleteExamDescription: "Are you sure you want to delete '{ title }'?",
    },
  };

</script>


<style lang="stylus" scoped></style>
