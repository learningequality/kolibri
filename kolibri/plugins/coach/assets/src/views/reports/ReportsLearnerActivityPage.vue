<template>

  <CoachAppBarPage
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <KPageContainer>

      <ReportsLearnerHeader :enablePrint="true" />

      <ActivityList
        embeddedPageName="ReportsLearnerActivityPage"
        :noActivityString="coachString('activityListEmptyState')"
      />

    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import ActivityList from '../common/notifications/ActivityList';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
      ReportsLearnerHeader,
    },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped></style>
