<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>

      <ReportsLearnerHeader :enablePrint="true" />

      <ActivityList
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
  };

</script>


<style lang="scss" scoped></style>
