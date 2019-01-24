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

  import commonCoach from '../common';
  import LearnerExerciseReport from '../common/LearnerExerciseReport';

  export default {
    name: 'ReportsLessonExerciseLearnerPage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
