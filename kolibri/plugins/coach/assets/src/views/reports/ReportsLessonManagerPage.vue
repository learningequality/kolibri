<template>

  <CoreBase
    :immersivePage="false"
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

  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonManagerPage',
    components: {},
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
