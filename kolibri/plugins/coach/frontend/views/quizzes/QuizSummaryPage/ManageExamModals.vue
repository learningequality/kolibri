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
      :cannotUndoActionWarning="coreString('cannotUndoActionWarning')"
      @submit="$emit('submit_delete')"
      @cancel="$emit('cancel')"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AssignmentCopyModal from '../../common/assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../common/assignments/AssignmentDeleteModal';

  export default {
    name: 'ManageExamModals',
    components: {
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    mixins: [commonCoreStrings],
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
      handleCopyModalSubmit(classroomId, groupIds, adHocLearnerIds) {
        this.$emit('submit_copy', {
          classroomId,
          groupIds,
          adHocLearnerIds,
          examTitle: this.$tr('copyOfExam', { examTitle: this.quiz.title }),
        });
      },
    },
    $trs: {
      copyExamTitle: {
        message: 'Copy quiz to',
        context:
          'Coaches can copy a quiz to a different group, another class or individual learners.',
      },
      assignmentQuestion: {
        message: 'Assign quiz to',
        context: "Text which appears on the 'Copy quiz' modal.",
      },
      deleteExamTitle: {
        message: 'Delete quiz',
        context:
          'Title on confirmation window that displays when a user attempts to delete a quiz.',
      },
      deleteExamDescription: {
        message: "Are you sure you want to delete '{ title }'?",
        context:
          'Description on confirmation window that displays when a user attempts to delete a quiz.',
      },
      deleteExamConfirmation: {
        message: 'All learner progress on this quiz will be lost.',
        context:
          'Description on confirmation window that displays when a user attempts to delete a quiz.',
      },
      copyOfExam: {
        message: 'Copy of { examTitle }',
        context:
          "If a quiz is copied to another group in the same class, it will appear in the 'Quizzes' tab as the 'Copy of (original name of quiz)'.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
