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

  .base-toolbar {
    position: relative;
    min-height: 3.5rem;
    padding-right: 24px;
    padding-left: 24px;
    font-size: 1.125rem;
    box-shadow:
      0 0 2px rgba(0, 0, 0, 0.12),
      0 2px 2px rgba(0, 0, 0, 0.2);
  }

</style>
