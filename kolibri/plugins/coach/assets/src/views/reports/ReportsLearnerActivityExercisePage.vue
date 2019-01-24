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

  import commonCoach from '../common';
  import LearnerExerciseReport from '../common/LearnerExerciseReport';

  export default {
    name: 'ReportsLearnerActivityExercisePage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
