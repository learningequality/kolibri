<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KGrid :gutter="16">
      <KGridItem size="100">
        <OverviewBlock />
      </KGridItem>
      <KGridItem sizes="100, 100, 50">
        <KGrid :gutter="16">
          <KGridItem size="100">
            <QuizzesBlock />
          </KGridItem>
          <KGridItem size="100">
            <LessonsBlock />
          </KGridItem>
        </KGrid>
      </KGridItem>
      <KGridItem sizes="100, 100, 50">
        <ActivityBlock />
      </KGridItem>
    </KGrid>

  </CoreBase>

</template>


<script>

  import commonCoach from '../../common';
  import OverviewBlock from './OverviewBlock';
  import ActivityBlock from './ActivityBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'HomePage',
    components: {
      OverviewBlock,
      ActivityBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

</style>
