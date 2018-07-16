<template>

  <div>
    <div
      class="pure-g"
      :style="{ marginLeft: marginOffset, marginRight: marginOffset }"
    >
      <slot></slot>
    </div>
    <overlay
      v-if="debug"
      :cols="actualNumCols"
      :gutterWidth="gutterWidth"
    />
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import logger from 'kolibri.lib.logging';
  import overlay from './overlay';

  const logging = logger.getLogger(__filename)


  /**
   * Grid layouts
   */
  export default {
    name: 'kGrid',
    components: { overlay },
    mixins: [responsiveWindow],
    props: {
      /**
       * Set a fixed number of columns, bypassing default responsive behavior.
       * Must be a multiple of 2, up to 12
       */
      cols: {
        type: [Number, String],
        required: false,
        validator(value) {
          if (value < 4 || value > 12) {
            logging.error(`Number of columns (${value}) is not between 4 and 12`);
            return false;
          }
          if (value % 2) {
            logging.error(`Number of columns (${value}) is not a multiple of 2`);
            return false;
          }
          return true;
        },
      },
      debug: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      actualNumCols() {
        // if cols is set as a prop, use that
        if (this.cols !== undefined) {
          return this.cols;
        }
        // otherwise, use responsive behaviors
        if (this.windowIsSmall) {
          return 4;
        }
        if (this.windowIsMedium) {
          return 8;
        }
        return 12;
      },
      gutterWidth() {
        if (this.windowIsSmall) {
          return 16;
        }
        // 16px when the smallest width of the device is < 600
        if (this.windowBreakpoint < 4 && Math.min(this.windowWidth, this.windowHeight) < 600) {
          return 16;
        }
        return 24;
      },
      marginOffset() {
        // Inner grid items use padding to define gutters, but then we need
        // to bring them back flush with the outer edges.
        return `${ -1 * this.gutterWidth / 2 }px`;
      },
    },
    provide () {
      // Injects reactive attributes to grid items:
      // https://medium.com/@znck/provide-inject-in-vue-2-2-b6473a7f7816
      const gridMetrics = {};
      Object.defineProperty(gridMetrics, 'numCols', {
        iteratable: true,
        get: () => this.actualNumCols,
      });
      Object.defineProperty(gridMetrics, 'gutterWidth', {
        iteratable: true,
        get: () => this.gutterWidth,
      });
      Object.defineProperty(gridMetrics, 'debug', {
        iteratable: true,
        get: () => this.debug,
      });
      return { gridMetrics };
    },
  };

</script>


<style lang="scss" scoped></style>
