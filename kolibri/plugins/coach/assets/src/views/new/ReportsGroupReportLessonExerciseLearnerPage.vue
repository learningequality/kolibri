<template>

  <div>
    <BackLink
      text="Counting with big numbers"
      :to="newCoachRoute('ReportsGroupReportLessonExerciseLearnerListPage')"
    />
    <LearnerExerciseReport />
  </div>

</template>


<script>

  import imports from './imports';
  import LearnerExerciseReport from './shared/LearnerExerciseReport';

  export default {
    name: 'ReportsGroupReportLessonExerciseLearnerPage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
