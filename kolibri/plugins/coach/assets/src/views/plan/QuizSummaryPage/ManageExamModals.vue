<template>

  <div>
    <!-- This component is deprecated, but still used for its $trs strings -->
  </div>

</template>


<script>

  export default {
    name: 'ManageExamModals',
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
