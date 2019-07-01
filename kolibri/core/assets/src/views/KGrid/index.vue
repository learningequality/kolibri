<template>

  <div>
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

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import logger from 'kolibri.lib.logging';
  import Overlay from './Overlay';

  const logging = logger.getLogger(__filename);

  /**
   * Grid layouts. By default have responsive number of columns and gutter sizes.
   */
  export default {
    name: 'KGrid',
    components: { Overlay },
    mixins: [responsiveWindow],
    props: {
      /**
       * Set a fixed number of columns, bypassing default responsive behavior.
       * This can be useful for nesting grids.
       */
      cols: {
        type: [Number, String],
        required: false,
        validator(value) {
          if (value < 2 || value > 12) {
            logging.error(`Number of columns (${value}) is not between 2 and 12`);
            return false;
          }
          return true;
        },
      },
      /**
       * Size of gutter in pixels, bypassing default responsive behavior.
       */
      gutter: {
        type: [Number, String],
        required: false,
        validator(value) {
          if (isNaN(value)) {
            logging.error(`Gutter (${value}) is not a number`);
            return false;
          }
          const size = parseInt(value);
          if (size !== Number(value)) {
            logging.error(`Gutter (${value}) is not an integer`);
            return false;
          }
          if (size % 2) {
            logging.error(`Gutter (${value}) must be divisible by 2`);
            return false;
          }
          return true;
        },
      },
      /**
       * Extra styles to attach to the grid DOM node
       */
      gridStyle: {
        type: Object,
        default: () => ({}),
      },
      /**
       * Show gridlines
       */
      debug: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      actualNumCols() {
        // if cols is set as a prop, use that
        if (this.cols !== undefined) {
          return parseInt(this.cols);
        }
        // otherwise, use responsive behaviors
        return this.windowGridColumns;
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
        get: () => (this.$el ? getComputedStyle(this.$el).direction : 'ltr'),
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
