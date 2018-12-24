<template>

  <div>
    <PlanHeader />
    Quiz list
  </div>

</template>


<script>

  import imports from './imports';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanQuizListPage',
    components: {
      PlanHeader,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
