<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsLearnerHeader :enablePrint="true" />

      <ActivityList
        :notificationParams="notificationParams"
        embeddedPageName="ReportsLearnerActivityPage"
        :noActivityString="coachString('activityListEmptyState')"
      />

    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ActivityList from '../common/notifications/ActivityList';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerActivityPage',
    components: {
      ActivityList,
      ReportsLearnerHeader,
    },
    mixins: [commonCoach],
    computed: {
      notificationParams() {
        return {
          collection_id: this.$route.params.classId,
          learner_id: this.$route.params.learnerId,
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
