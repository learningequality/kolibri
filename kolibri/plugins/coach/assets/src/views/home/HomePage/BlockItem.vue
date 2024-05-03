<template>

  <div
    class="block-item"
    :class="{ small: windowIsSmall }"
    :style="{ borderBottomColor: $themeTokens.fineLine }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'BlockItem',
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .block-item {
    padding-top: 8px;
    padding-right: 24px;
    padding-left: 24px;
    margin-right: -24px;
    margin-left: -24px;
    border-bottom-style: none;
    border-bottom-width: 0;

    &:not(:last-child) {
      padding-bottom: 16px;
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }

    &:last-child {
      padding-top: 16px;
    }
  }

  .small .block-item {
    padding-right: 16px;
    padding-left: 16px;
    margin-right: -16px;
    margin-left: -16px;
  }

</style>
