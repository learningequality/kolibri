<template>

  <div>
    <BackLink
      text="Julie"
      :to="newCoachRoute('ReportsGroupLearnerReportPage')"
    />
    <LearnerQuizReport />
  </div>

</template>


<script>

  import imports from './imports';
  import LearnerQuizReport from './shared/LearnerQuizReport';

  export default {
    name: 'ReportsGroupLearnerReportQuizPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
