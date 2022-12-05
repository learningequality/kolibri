<template>

  <CoachImmersivePage
    :appBarTitle="exam.title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="back"
    :primary="false"
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
    name: 'ReportsQuizLearnerPage',
    components: {
      CoachImmersivePage,
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('examReportDetail', ['exam']),
      toolbarRoute() {
        const backRoute = this.backRouteForQuery(this.$route.query);
        return backRoute || this.classRoute('ReportsQuizLearnerListPage', {});
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
          query: this.$route.query,
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
