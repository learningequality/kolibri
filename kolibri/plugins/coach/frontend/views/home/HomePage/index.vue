<template>

  <CoachAppBarPage>
    <KGrid gutter="16">
      <KGridItem>
        <OverviewBlock />
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <AttendanceBlock />
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <QuizzesBlock />
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <LessonsBlock />
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <ActivityBlock />
      </KGridItem>
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import CoachAppBarPage from '../../CoachAppBarPage';
  import commonCoach from '../../common';
  import AttendanceBlock from './AttendanceBlock';
  import OverviewBlock from './OverviewBlock';
  import ActivityBlock from './ActivityBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'HomePage',
    components: {
      CoachAppBarPage,
      AttendanceBlock,
      OverviewBlock,
      ActivityBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

</style>
