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
    name: 'ReportsQuizLearnerPage',
    components: {
      LearnerQuizReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('examReportDetail', ['exam']),
      toolbarRoute() {
        return this.classRoute('ReportsQuizLearnerListPage', {});
      },
    },
    $trs: {},
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
