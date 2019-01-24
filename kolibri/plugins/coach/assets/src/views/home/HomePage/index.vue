<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KGrid :gutter="16">
      <KGridItem size="100" percentage>
        <OverviewBlock class="new-coach-block" />
      </KGridItem>
      <KGridItem sizes="100, 100, 50" percentage>
        <KGrid :gutter="16">
          <KGridItem size="100" percentage>
            <QuizzesBlock class="new-coach-block" />
          </KGridItem>
          <KGridItem size="100" percentage>
            <!-- <LessonsBlock class="new-coach-block" /> -->
          </KGridItem>
        </KGrid>
      </KGridItem>
      <KGridItem sizes="100, 100, 50" percentage>
        <ActivityBlock class="new-coach-block" />
      </KGridItem>
    </KGrid>

  </CoreBase>

</template>


<script>

  import commonCoach from '../../common';
  import OverviewBlock from './OverviewBlock';
  import ActivityBlock from './ActivityBlock';
  // import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'HomePage',
    components: {
      OverviewBlock,
      ActivityBlock,
      // LessonsBlock,
      QuizzesBlock,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: auto;
    margin-top: 16px;
  }

</style>
