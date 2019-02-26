<template>

  <div>
    <!-- This component is deprecated, but still used for its $trs strings -->
  </div>

</template>


<script>

  export default {
    name: 'ExamReportPage',
    $trs: {
      averageScore: 'Average score: {num, number, percent}',
      noAverageScore: 'Average score: –',
      examReport: 'Quiz report',
      completed: 'Completed',
      remaining: '{ num, number } {num, plural, one {question} other {questions}} remaining',
      notstarted: 'Not started',
      name: 'Full Name',
      progress: 'Progress',
      score: 'Score',
      scorePercentage: '{num, number, percent}',
      group: 'Group',
      noExamData: 'No data to show.',
      options: 'Options',
      previewExam: 'Preview',
      editDetails: 'Edit details',
      copyExamOptionLabel: 'Copy quiz',
      delete: 'Delete',
      viewByGroups: 'View by groups',
      allLearners: 'All learners',
      started: 'Started',
      ungrouped: 'Ungrouped',
    },
  };

</script>


<style lang="scss" scoped></style>
