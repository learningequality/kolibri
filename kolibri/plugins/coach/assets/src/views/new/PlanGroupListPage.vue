<template>

  <div>
    <PlanHeader />
    Group list
  </div>

</template>


<script>

  import imports from './imports';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanGroupListPage',
    components: {
      PlanHeader,
    },
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
