<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('classesLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />
    <div class="new-coach-block">
      <PlanHeader />
      Quiz list
    </div>
  </CoreBase>

</template>


<script>

  import imports from './imports';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanQuizListPage',
    components: {
      PlanHeader,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
