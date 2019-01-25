<template>

  <div>
    <BackLink
      :text="coachStrings.$tr('combinedLabel', {firstItem: 'Julie', secondItem: 'Some lesson'})"
      :to="classRoute('ReportsLearnerReportLessonPage', {})"
    />
    <LearnerExerciseReport />
  </div>

</template>


<script>

  import commonCoach from '../common';
  import LearnerExerciseReport from '../common/LearnerExerciseReport';

  export default {
    name: 'ReportsLearnerReportLessonExercisePage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
