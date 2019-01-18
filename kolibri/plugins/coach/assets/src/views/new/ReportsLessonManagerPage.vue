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
      Resource manager
    </div>
  </CoreBase>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsLessonManagerPage',
    components: {},
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
