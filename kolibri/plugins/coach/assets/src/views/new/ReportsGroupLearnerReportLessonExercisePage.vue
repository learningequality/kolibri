<template>

  <div>
    <BackLink
      :text="coachStrings.$tr('combinedLabel', {firstItem: 'Julie', secondItem: 'Some lesson'})"
      :to="newCoachRoute('ReportsGroupLearnerReportLessonPage')"
    />
    <LearnerExerciseReport />
  </div>

</template>


<script>

  import imports from './imports';
  import LearnerExerciseReport from './shared/LearnerExerciseReport';

  export default {
    name: 'ReportsGroupLearnerReportLessonExercisePage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
