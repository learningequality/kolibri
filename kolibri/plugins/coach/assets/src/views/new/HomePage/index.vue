<template>

  <KGrid>
    <KGridItem size="100" percentage>
      <OverviewBlock />
    </KGridItem>
    <KGridItem size="50" percentage>
      <LessonsBlock />
    </KGridItem>
    <KGridItem size="50" percentage>
      <QuizzesBlock />
    </KGridItem>
    <KGridItem size="100" percentage>
      <ActivityBlock />
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


<style lang="scss" scoped></style>
