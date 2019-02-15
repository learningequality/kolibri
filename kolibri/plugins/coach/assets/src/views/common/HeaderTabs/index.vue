<template>

  <div class="tab-block" :class="{ small: windowIsSmall }">
    <slot></slot>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'HeaderTabs',
    mixins: [responsiveWindow],
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

  .small {
    padding-right: 16px;
    padding-left: 16px;
    margin-right: -16px;
    margin-bottom: 16px;
    margin-left: -16px;
  }

</style>
