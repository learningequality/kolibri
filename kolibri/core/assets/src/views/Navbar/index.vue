<template>

  <nav>
    <ul
      ref="navbarUl"
      class="items"
      tabindex="-1"
    >
      <!-- Contains NavbarLink components -->
      <slot></slot>
    </ul>
  </nav>

</template>


<script>

  /**
   * Used for navigation between sub-pages of a top-level Kolibri section
   */
  export default {
    name: 'Navbar',
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .items {
    display: flex;
    padding: 0;
    margin-bottom: 4px;
    margin-left: 16px;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
  }

  @media (max-width: 840px) {
    .items {
      margin-top: 0;
    }
  }

</style>
