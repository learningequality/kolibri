<template>

  <nav>
    <ul
      ref="navbarUl"
      class="items"
      tabindex="-1"
      :style="mediumAndSmallStyleOverrides"
    >
      <!-- Contains NavbarLink components -->
      <slot></slot>
    </ul>
  </nav>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  /**
   * Used for navigation between sub-pages of a top-level Kolibri section
   */
  export default {
    name: 'Navbar',
    mixins: [responsiveWindowMixin],
    computed: {
      mediumAndSmallStyleOverrides() {
        return !this.windowIsLarge ? { marginTop: 0 } : {};
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .items {
    display: flex;
    padding: 0;
    margin-bottom: 4px;
    margin-left: 16px;
    overflow-x: hidden;
    overflow-y: hidden;
    white-space: nowrap;
  }

</style>
