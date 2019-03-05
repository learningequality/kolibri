<template>

  <div
    class="block-item"
    :class="{ small : windowIsSmall }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'BlockItem',
    mixins: [responsiveWindow],
  };

</script>


<style lang="scss" scoped>

  .block-item {
    padding-top: 8px;
    padding-right: 24px;
    padding-bottom: 8px;
    padding-left: 24px;
    margin-right: -24px;
    margin-left: -24px;

    &:not(:last-child) {
      border-bottom: 1px solid #dedede;
    }
  }

  .small .block-item {
    padding-right: 16px;
    padding-left: 16px;
    margin-right: -16px;
    margin-left: -16px;
  }

</style>
