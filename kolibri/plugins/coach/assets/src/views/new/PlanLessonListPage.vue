<template>

  <div>

    Plan lesson list

    <PlanHeader />
  </div>

</template>


<script>

  import imports from './imports';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanLessonListPage',
    components: {
      PlanHeader,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
