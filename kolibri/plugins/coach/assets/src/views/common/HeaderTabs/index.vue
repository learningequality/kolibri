<template>

  <div class="tab-block">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'HeaderTabs',
  };

</script>


<style lang="scss" scoped>

  .tab-block {
    padding-right: 24px;
    padding-left: 24px;
    margin-right: -24px;
    margin-bottom: 24px;
    margin-left: -24px;
    border-bottom: 1px solid #dedede;
  }

</style>
