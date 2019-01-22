<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />
    <div class="new-coach-block">
      <PlanHeader />
      Learner list
    </div>
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
