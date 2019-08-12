<template>

  <KFixedGrid
    :numCols="windowGridColumns"
    :gutter="gutter"
    :gridStyle="gridStyle"
    :debug="debug"
  >
    <slot></slot>
  </KFixedGrid>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import KFixedGrid from './KFixedGrid';
  import { validateGutter } from './common';

  /**
   * Grid layout with a dynamic number of columns based on the current window width.
   *
   * The grid will have 4 columns for small windows (width < 840 px), 8 columns
   * for medium windows (840 px <= width < 960), and 12 columns for large windows
   * (960px <=  width)
   */
  export default {
    name: 'KGrid',
    components: { KFixedGrid },
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * Set the size of gutter in pixels. If not provided, the gutter is set tp 16px
       * if either window dimension is less than 600px, and set to 24px otherwise.
       */
      gutter: {
        type: [Number, String],
        required: false,
        validator: validateGutter,
      },
      /**
       * EXPERIMENTAL: Extra styles to attach to the internal grid DOM node
       * @protected
       */
      gridStyle: {
        type: Object,
        default: () => ({}),
      },
      /**
       * EXPERIMENTAL: Show gridlines for debugging purposes
       * @protected
       */
      debug: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      windowGridColumns() {
        if (this.windowIsSmall) {
          return 4;
        }
        if (this.windowIsMedium) {
          return 8;
        }
        // windowIsLarge
        return 12;
      },
    },
  };

</script>


<style lang="scss"></style>
