<template>

  <CoachImmersivePage
    :appBarTitle="exam.title"
    :route="toolbarRoute"
  >
    <LearnerQuizReport @navigate="handleNavigation" />
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';
  import LearnerQuizReport from '../common/LearnerQuizReport';

  export default {
    name: 'ReportsLearnerReportQuizPage',
    components: {
      CoachImmersivePage,
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('examReportDetail', ['exam']),
      toolbarRoute() {
        const backRoute = this.backRouteForQuery(this.$route.query);
        return backRoute || this.classRoute('ReportsLearnerReportPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            ...params,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
