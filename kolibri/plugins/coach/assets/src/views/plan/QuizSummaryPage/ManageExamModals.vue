<template>

  <div>
    <AssignmentCopyModal
      v-if="currentAction === 'COPY'"
      :modalTitle="$tr('copyExamTitle')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="$route.params.classId"
      :classList="classList"
      @submit="handleCopyModalSubmit"
      @cancel="$emit('cancel')"
    />

    <AssignmentDeleteModal
      v-if="currentAction === 'DELETE'"
      :modalTitle="$tr('deleteExamTitle')"
      :modalDescription="$tr('deleteExamDescription', { title: quiz.title })"
      :modalConfirmation="$tr('deleteExamConfirmation')"
      @submit="$emit('submit_delete')"
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
    },
    methods: {
      handleCopyModalSubmit(classroomId, groupIds) {
        this.$emit('submit_copy', {
          classroomId,
          groupIds,
          examTitle: this.$tr('copyOfExam', { examTitle: this.quiz.title }),
        });
      },
    },
    $trs: {
      copyExamTitle: 'Copy quiz to',
      assignmentQuestion: 'Assign quiz to',
      deleteExamTitle: 'Delete quiz',
      deleteExamDescription: "Are you sure you want to delete '{ title }'?",
      deleteExamConfirmation: 'All learner progress on this quiz will be lost.',
      copyOfExam: 'Copy of { examTitle }',
      // Not used within the component
      changeExamStatusTitle: 'Change quiz status',
      changeExamStatusDescription: 'Learners can only see active quizzes',
      changeExamStatusActive: 'Active',
      changeExamStatusInactive: 'Inactive',
      editExamDetails: 'Edit quiz details',
      duplicateTitle: 'A quiz with that name already exists',
      saveExamError: 'There was a problem saving this quiz',
    },
  };

</script>


<style lang="scss" scoped></style>
