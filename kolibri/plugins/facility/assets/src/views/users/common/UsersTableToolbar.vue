<template>

  <div class="toolbar-container">
    <div class="top-row">
      <slot name="topRow"></slot>
    </div>
    <div class="bottom-row">
      <slot name="bottomRow"></slot>
    </div>
  </div>

</template>


<script>

  /**
   * UsersTableToolbar - A layout component for the users table toolbar
   * Provides two rows for flexible arrangement of toolbar actions
   * All logic for search, filtering, and pagination should be handled by parent components
   */
  export default {
    name: 'UsersTableToolbar',
  };

</script>


<style lang="scss" scoped>

  .toolbar-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
    margin-bottom: 1em;
  }

  .top-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
    align-items: center;
    justify-content: space-between;
  }

  .bottom-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
    align-items: center;
    justify-content: space-between;
  }

</style>
