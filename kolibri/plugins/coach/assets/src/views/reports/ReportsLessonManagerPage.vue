<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>
      Resource manager
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonManagerPage',
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped></style>
