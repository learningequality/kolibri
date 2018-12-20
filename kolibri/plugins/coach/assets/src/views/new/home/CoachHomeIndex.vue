<template>

  <div>

    <ClassOverviewBlock />
    <LessonsBlock />
    <QuizzesBlock />

  </div>

</template>


<script>

  import ClassOverviewBlock from './ClassOverviewBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'CoachHomeIndex',
    components: {
      ClassOverviewBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
