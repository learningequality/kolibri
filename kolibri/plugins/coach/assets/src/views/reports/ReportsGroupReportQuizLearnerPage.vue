<template>

  <div>
    <BackLink text="Some quiz" :to="backLink" />
    <LearnerQuizReport />
  </div>

</template>


<script>

  import commonCoach from '../common';
  import LearnerQuizReport from '../common/LearnerQuizReport';

  export default {
    name: 'ReportsGroupReportQuizLearnerPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsGroupReportQuizLearnerListPage');
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
