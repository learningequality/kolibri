<template>

  <CoachAppBarPage>
    <KPageContainer> Resource manager </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';

  export default {
    name: 'ReportsLessonManagerPage',
    components: { CoachAppBarPage },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped></style>
