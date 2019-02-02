<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      Resource manager
    </KPageContainer>
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
