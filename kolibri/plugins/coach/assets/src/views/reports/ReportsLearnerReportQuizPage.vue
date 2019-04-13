<template>

  <CoreBase
    :immersivePage="true"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="exam.title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <LearnerQuizReport
      @navigate="handleNavigation"
    />
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import LearnerQuizReport from '../common/LearnerQuizReport';

  export default {
    name: 'ReportsLearnerReportQuizPage',
    components: {
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
