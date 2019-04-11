<template>

  <div>
    <AssignmentCopyModal
      v-if="currentAction === 'COPY'"
      :modalTitle="this.$tr('copyExamTitle')"
      :assignmentQuestion="this.$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @copy="handleCopySubmit"
      @cancel="$emit('cancel')"
    />

    <AssignmentDeleteModal
      v-if="currentAction === 'DELETE'"
      :modalTitle="this.$tr('deleteExamTitle')"
      :modalDescription="this.$tr(
        'deleteExamDescription',
        { title: quiz.title }
      )"
      :modalConfirmation="this.$tr('deleteExamConfirmation')"
      @delete="$emit('submit_delete')"
      @cancel="$emit('cancel')"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import AssignmentCopyModal from '../assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../assignments/AssignmentDeleteModal';

  export default {
    name: 'ManageExamModals',
    components: {
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    props: {
      // Passed-through quiz object from parent
      quiz: {
        type: Object,
        required: true,
      },
      // Enum of 'COPY' or 'EDIT_DETAIlS', matching values from QuizOptionsDropdownMenu
      currentAction: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState(['classList']),
      classId() {
        return this.$route.params.classId;
      },
    },
    methods: {
      handleCopySubmit(classroomId, groupIds) {
        this.$emit(
          'submit_copy',
          classroomId,
          groupIds,
          this.$tr('copyOfExam', { examTitle: this.quiz.title })
        );
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
      duplicateTitle: 'A quiz with that name already exists',
      saveExamError: 'There was a problem saving this quiz',
      copyOfExam: 'Copy of { examTitle }',
    },
  };

</script>


<style lang="scss" scoped></style>
