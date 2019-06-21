<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coreCommon$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />
    <KPageContainer>
      <PlanHeader />
      Learner list
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanLearnerListPage',
    components: {
      PlanHeader,
    },
    mixins: [coreStringsMixin],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
