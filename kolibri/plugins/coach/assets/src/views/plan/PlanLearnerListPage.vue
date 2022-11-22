<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <AppBarPage
      :title="coreString('coachLabel')"
    >
      <template #subNav>
        <TopNavbar />
      </template>

      <KPageContainer>
        <PlanHeader />
        Learner list
      </KPageContainer>
    </AppBarPage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanLearnerListPage',
    components: {
      AppBarPage,
      NotificationsRoot,
      PlanHeader,
    },
    mixins: [commonCoreStrings],
  };

</script>


<style lang="scss" scoped></style>
