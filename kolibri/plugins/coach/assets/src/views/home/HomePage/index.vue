<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />
    <KCheckbox
      :label="coachStrings.$tr('onlyActiveLearnersLabel')"
      :checked="showOnlyActive"
      @change="showOnlyActive = !showOnlyActive"
    />
    <KGrid :gutter="16">
      <KGridItem size="100" percentage>
        <OverviewBlock :showOnlyActive="showOnlyActive" />
      </KGridItem>
      <KGridItem sizes="100, 100, 50" percentage>
        <KGrid :gutter="16">
          <KGridItem size="100" percentage>
            <QuizzesBlock :showOnlyActive="showOnlyActive" />
          </KGridItem>
          <KGridItem size="100" percentage>
            <LessonsBlock :showOnlyActive="showOnlyActive" />
          </KGridItem>
        </KGrid>
      </KGridItem>
      <KGridItem sizes="100, 100, 50" percentage>
        <LiveAttendanceBlock />
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
  import LiveAttendanceBlock from './LiveAttendanceBlock';

  export default {
    name: 'HomePage',
    components: {
      OverviewBlock,
      ActivityBlock,
      LessonsBlock,
      QuizzesBlock,
      LiveAttendanceBlock,
    },
    mixins: [commonCoach],
    data() {
      return {
        showOnlyActive: true,
      };
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

</style>
