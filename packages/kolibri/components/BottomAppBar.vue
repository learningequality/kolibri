<template>

  <div
    class="bottom"
    :style="{ backgroundColor: $themeTokens.surface }"
    :class="{ 'bottom-sm': windowIsSmall }"
  >
    <div class="inner-bottom">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'BottomAppBar',
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .bottom {
    @extend %dropshadow-6dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 8; // material - Bottom app bar
    width: 100%;
    height: 72px;
    padding: 0 8px;
    margin: 0;
    overflow-x: hidden;
    font-size: 14px;
    text-align: right;
  }

  .bottom-sm {
    min-height: 72px;
  }

  .inner-bottom {
    height: 100%;
    padding-top: 16px;
    padding-right: 16px;
    overflow-x: hidden;
    overflow-y: visible; // Ensures feedback text is visible
  }

</style>
