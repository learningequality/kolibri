<template>

  <div>
    <BackLink text="Some quiz" :to="backLink" />
    <LearnerQuizReport />
  </div>

</template>


<script>

  import imports from './imports';
  import LearnerQuizReport from './shared/LearnerQuizReport';

  export default {
    name: 'ReportsGroupReportQuizLearnerPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [imports],
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsGroupReportQuizLearnerListPage');
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
