<template>

  <div
    class="block-item"
    :class="{ small : windowIsSmall }"
    :style="{ borderBottomColor: $themeTokens.fineLine }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'BlockItem',
    mixins: [responsiveWindowMixin],
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
    border-bottom-style: none;
    border-bottom-width: 0;

    &:not(:last-child) {
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }
  }

  .small .block-item {
    padding-right: 16px;
    padding-left: 16px;
    margin-right: -16px;
    margin-left: -16px;
  }

</style>
