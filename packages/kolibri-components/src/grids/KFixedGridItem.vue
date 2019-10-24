<template>

  <div class="grid-item" :class="unitClass" :style="computedStyle">
    <div :class="{ debug: gridMetrics.debug, error: !validInputs }">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import logger from 'kolibri.lib.logging';
  import { validateAlignment, validateSpan } from './common';

  const logging = logger.getLogger(__filename);

  /**
   * Basic fixed grid item
   */
  export default {
    name: 'KFixedGridItem',
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * Number of grid columns that the item should span.
       *
       * If not provided, the item will span the full width of the grid.
       */
      span: {
        type: [Number, String],
        required: false,
        validator: validateSpan,
      },
      /**
       * Horizontal alignment of the item's contents. Can be 'right',
       * 'left', or 'center'.
       */
      alignment: {
        type: String,
        default: 'left',
        validator: validateAlignment,
      },
    },
    inject: ['gridMetrics'], // provided by the parent grid component
    computed: {
      computedSpan() {
        if (this.span === undefined) {
          return this.gridMetrics.numCols;
        }
        return parseInt(this.span);
      },
      unitClass() {
        const size = this.computedSpan;
        const numCols = this.gridMetrics.numCols;
        // handle percentage
        if (this.percentage) {
          return `pure-u-${(24 * size) / 100}-24`;
        }
        // handle size in number of columns
        if (24 % numCols === 0) {
          // handled by Pure's built-in 24-column units
          return `pure-u-${(24 * size) / numCols}-24`;
        }
        // handled by our custom extra units
        return `pure-u-${size}-${numCols}`;
      },
      computedStyle() {
        const padding = `${this.gridMetrics.gutterWidth / 2}px`;
        const style = {
          paddingLeft: padding,
          paddingRight: padding,
        };
        let isRtl = this.isRtl;
        if (this.gridMetrics && this.gridMetrics.direction) {
          isRtl = this.gridMetrics.direction === 'rtl';
        }
        if (isRtl && this.alignment === 'left') {
          style.textAlign = 'right';
        } else if (isRtl && this.alignment === 'right') {
          style.textAlign = 'left';
        } else {
          style.textAlign = this.alignment;
        }
        return style;
      },
      validInputs() {
        if (!this.gridMetrics || !this.gridMetrics.numCols || !this.gridMetrics.gutterWidth) {
          logging.error('Grid metrics were not provided by parent');
          return false;
        }
        if (this.computedSpan > this.gridMetrics.numCols) {
          logging.error(
            `Item span (${this.computedSpan}) is larger than grid size (${this.gridMetrics.numCols})`
          );
          return false;
        }
        return true;
      },
    },
  };

</script>


<style lang="scss" scoped>

  // pure grid units
  @import '~purecss/build/grids-units.css';
  @import './extra-units.css';

  @import '~kolibri.styles.definitions';

  .grid-item {
    // override pure grid default font family
    @include font-family-noto;
  }

  .debug {
    border: 1px solid #e6c003;
  }

  .error {
    border: 2px solid red !important;
  }

</style>
