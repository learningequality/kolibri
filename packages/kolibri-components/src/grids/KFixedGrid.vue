<template>

  <div style="direction: inherit;">
    <div class="pure-g" :style="style">
      <slot></slot>
    </div>
    <Overlay
      v-if="debug"
      :cols="actualNumCols"
      :gutterWidth="windowGutter"
    />
  </div>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import logger from 'kolibri.lib.logging';
  import Overlay from './Overlay';
  import { validateGutter } from './common';

  const logging = logger.getLogger(__filename);

  /**
   * Grid layout with a fixed number of columns
   */
  export default {
    name: 'KFixedGrid',
    components: { Overlay },
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * The number of columns. Can be an integer between 2 and 12
       */
      numCols: {
        type: [Number, String],
        required: true,
        validator(value) {
          if (value < 2 || value > 12) {
            logging.error(`Number of columns (${value}) must be between 2 and 12`);
            return false;
          }
          return true;
        },
      },
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
       */
      gridStyle: {
        type: Object,
        default: () => ({}),
      },
      /**
       * EXPERIMENTAL: Show gridlines for debugging purposes
       */
      debug: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      actualNumCols() {
        return parseInt(this.numCols);
      },
      actualGutterSize() {
        if (this.gutter !== undefined) {
          return this.gutter;
        }
        return this.windowGutter;
      },
      marginOffset() {
        // Inner grid items use padding to define gutters, but then we need
        // to bring them back flush with the outer edges.
        return `${(-1 * this.actualGutterSize) / 2}px`;
      },
      style() {
        const style = { marginLeft: this.marginOffset, marginRight: this.marginOffset };
        Object.assign(style, this.gridStyle);
        return style;
      },
    },
    provide() {
      // Injects reactive attributes to grid items:
      // https://medium.com/@znck/provide-inject-in-vue-2-2-b6473a7f7816
      const gridMetrics = {};
      Object.defineProperty(gridMetrics, 'numCols', {
        enumerable: true,
        get: () => this.actualNumCols,
      });
      Object.defineProperty(gridMetrics, 'gutterWidth', {
        enumerable: true,
        get: () => this.actualGutterSize,
      });
      Object.defineProperty(gridMetrics, 'direction', {
        enumerable: true,
        get: () => (this.$el ? getComputedStyle(this.$el).direction : undefined),
      });
      Object.defineProperty(gridMetrics, 'debug', {
        enumerable: true,
        get: () => this.debug,
      });
      return { gridMetrics };
    },
  };

</script>


<style lang="scss">

  // Include pure-css definitions globally (unscoped)
  @import '~purecss/build/grids-core.css';

</style>
