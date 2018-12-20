<template>

  <div>

    <ClassOverviewBlock />
    <LessonsBlock />

  </div>

</template>


<script>

  import ClassOverviewBlock from './ClassOverviewBlock';
  import LessonsBlock from './LessonsBlock';

  export default {
    name: 'CoachHomeIndex',
    components: {
      ClassOverviewBlock,
      LessonsBlock,
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
