<template>

  <nav>
    <ul
      ref="navbarUl"
      class="items"
      tabindex="-1"
      :style="styleOverrides"
    >
      <!-- Contains NavbarLink components -->
      <slot></slot>
    </ul>
  </nav>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  /**
   * Used for navigation between sub-pages of a top-level Kolibri section
   */
  export default {
    name: 'Navbar',
    setup() {
      const { windowIsLarge, windowIsMedium } = useKResponsiveWindow();
      return {
        windowIsLarge,
        windowIsMedium,
      };
    },
    computed: {
      styleOverrides() {
        const styles = { maxHeight: '52px' };
        if (this.windowIsLarge) {
          return styles;
        }
        styles.marginTop = 0;
        if (this.windowIsMedium) {
          return styles;
        }
        styles.maxHeight = '42px';
        return styles;
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
