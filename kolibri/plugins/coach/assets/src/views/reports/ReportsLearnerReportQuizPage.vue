<template>

  <div>
    <BackLink
      text="Julie"
      :to="newCoachRoute('ReportsLearnerReportPage')"
    />
    <LearnerQuizReport />
  </div>

</template>


<script>

  import commonCoach from '../common';
  import LearnerQuizReport from '../common/LearnerQuizReport';

  export default {
    name: 'ReportsLearnerReportQuizPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
