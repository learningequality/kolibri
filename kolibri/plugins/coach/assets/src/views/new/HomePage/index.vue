<template>

  <KGrid :gutter="8">
    <KGridItem size="100" percentage>
      <OverviewBlock class="new-coach-block" />
    </KGridItem>
    <KGridItem sizes="100, 50, 50" percentage>

      <KGrid :gutter="8">
        <KGridItem size="100" percentage>
          <QuizzesBlock class="new-coach-block" />
        </KGridItem>
        <KGridItem size="100" percentage>
          <LessonsBlock class="new-coach-block" />
        </KGridItem>
      </KGrid>

    </KGridItem>
    <KGridItem sizes="100, 50, 50" percentage>
      <ActivityBlock class="new-coach-block" />
    </KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import OverviewBlock from './OverviewBlock';
  import ActivityBlock from './ActivityBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'HomePage',
    components: {
      KGrid,
      KGridItem,
      OverviewBlock,
      ActivityBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    margin-top: 8px;
  }

</style>
