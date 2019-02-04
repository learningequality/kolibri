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
    name: 'ReportsGroupLearnerReportQuizPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    $trs: {},
    computed: {
      ...mapState('examReportDetail', ['exam']),
      toolbarRoute() {
        return this.classRoute('ReportsGroupLearnerReportPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            groupId: this.$route.params.groupId,
            ...params,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
