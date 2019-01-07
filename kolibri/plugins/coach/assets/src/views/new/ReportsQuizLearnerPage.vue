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
    name: 'ReportsQuizLearnerPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [imports],
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsQuizLearnerListPage');
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
