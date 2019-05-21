<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="common$tr('coachLabel')"
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

  import commonCoach from '../common';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanLearnerListPage',
    components: {
      PlanHeader,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
