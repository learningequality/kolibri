<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsGroupHeader :enablePrint="true" />

      <ActivityList
        :notificationParams="notificationParams"
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
    computed: {
      notificationParams() {
        return {
          collection_id: this.$route.params.groupId,
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
