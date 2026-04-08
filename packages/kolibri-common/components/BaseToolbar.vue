<template>

  <div
    class="base-toolbar"
    :style="{
      color: $themeTokens.text,
      backgroundColor: $themeTokens.surface,
    }"
  >
    <slot></slot>
  </div>

</template>


<script>

  /**
   * A simple toolbar with appearance derived from KToolbar.
   * It behaves like a container that doesn't provide any implementation
   * of its internal content layout. Insted, its content area is expected
   * to be fully controlled from components that use this toolbar.
   * It is suitable for toolbar layouts that don't conform to typical KToolbar
   * use-cases or when using KToolbar may be possible but is complicated
   * and requires many /deep/ overrides and fixes.
   */
  export default {
    name: 'BaseToolbar',
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .base-toolbar {
    position: relative;
    z-index: 1;
    min-height: 48px;
    padding: 0 16px;
    font-size: 1.125rem;

    @extend %dropshadow-2dp;
  }

</style>
