<template>

  <CoachAppBarPage
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <KPageContainer>

      <ReportsGroupHeader :enablePrint="true" />

      <ActivityList
        embeddedPageName="ReportsGroupActivityPage"
        :noActivityString="coachString('activityListEmptyState')"
      />

    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import ActivityList from '../common/notifications/ActivityList';
  import ReportsGroupHeader from './ReportsGroupHeader';

  export default {
    name: 'ReportsGroupActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
      ReportsGroupHeader,
    },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped></style>
