<template>

  <div>
    <BackLink
      text="Counting with big numbers"
      :to="newCoachRoute('ReportsLessonExerciseLearnerListPage')"
    />
    <LearnerExerciseReport />
  </div>

</template>


<script>

  import imports from './imports';
  import LearnerExerciseReport from './shared/LearnerExerciseReport';

  export default {
    name: 'ReportsLessonExerciseLearnerPage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
