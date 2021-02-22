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

      <ReportsGroupHeader :enablePrint="true" />

      <ActivityList
        embeddedPageName="ReportsGroupActivityPage"
        :noActivityString="coachString('activityListEmptyState')"
      />

    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ActivityList from '../common/notifications/ActivityList';
  import ReportsGroupHeader from './ReportsGroupHeader';

  export default {
    name: 'ReportsGroupActivityPage',
    components: {
      ActivityList,
      ReportsGroupHeader,
    },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped></style>
