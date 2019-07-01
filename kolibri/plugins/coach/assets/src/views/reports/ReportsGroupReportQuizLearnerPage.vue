<template>

  <CoreBase
    :immersivePage="true"
    :immersivePagePrimary="true"
    immersivePageIcon="arrow_back"
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
    name: 'ReportsGroupReportQuizLearnerPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('examReportDetail', ['exam']),
      toolbarRoute() {
        return this.classRoute('ReportsGroupReportQuizLearnerListPage', {});
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
