<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coreString('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>
      <PlanHeader />
      Learner list
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanLearnerListPage',
    components: {
      PlanHeader,
    },
    mixins: [commonCoreStrings],
  };

</script>


<style lang="scss" scoped></style>
