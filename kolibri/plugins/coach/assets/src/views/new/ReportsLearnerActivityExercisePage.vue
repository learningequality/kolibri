<template>

  <div>
    <BackLink
      :text="coachStrings.$tr('activityLabel')"
      :to="newCoachRoute('ReportsLearnerActivityPage')"
    />
    <LearnerExerciseReport />
  </div>

</template>


<script>

  import imports from './imports';
  import LearnerExerciseReport from './shared/LearnerExerciseReport';

  export default {
    name: 'ReportsLearnerActivityExercisePage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
