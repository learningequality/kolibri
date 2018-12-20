<template>

  <KGrid>
    <KGridItem size="100" percentage>
      <ClassOverviewBlock />
    </KGridItem>
    <KGridItem size="50" percentage>
      <LessonsBlock />
    </KGridItem>
    <KGridItem size="50" percentage>
      <QuizzesBlock />
    </KGridItem>
    <KGridItem size="100" percentage>
      <ClassActivityBlock />
    </KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import ClassOverviewBlock from './ClassOverviewBlock';
  import ClassActivityBlock from './ClassActivityBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'CoachHomeIndex',
    components: {
      KGrid,
      KGridItem,
      ClassOverviewBlock,
      ClassActivityBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
