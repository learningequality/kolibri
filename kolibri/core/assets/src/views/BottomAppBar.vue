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

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'BottomAppBar',
    mixins: [responsiveWindowMixin],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .bottom {
    @extend %dropshadow-8dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 8; // material - Bottom app bar
    width: 100%;
    height: 72px;
    padding: 16px 24px 0;
    margin: 0;
    overflow-x: hidden;
    font-size: 14px;
    text-align: right;
  }

  .bottom-sm {
    height: auto;
    min-height: 72px;
  }

  .inner-bottom {
    height: 100%;
    overflow-x: hidden;
    overflow-y: visible; // Ensures feedback text is visible
  }

</style>
