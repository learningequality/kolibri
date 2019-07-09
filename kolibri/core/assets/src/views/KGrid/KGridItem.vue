<template>

  <div class="grid-item" :class="unitClass" :style="computedStyle">
    <div :class="{ debug: gridMetrics.debug, error: !validInputs }">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import logger from 'kolibri.lib.logging';

  const logging = logger.getLogger(__filename);

  function checkNumber(value) {
    if (isNaN(value)) {
      logging.error(`Size (${value}) is not a number`);
      return false;
    }
    const size = parseInt(value);
    if (size !== Number(value)) {
      logging.error(`Size (${value}) is not an integer`);
      return false;
    }
    if (size < 1) {
      logging.error(`Size (${value}) is invalid`);
      return false;
    }
    return true;
  }

  function checkAlignment(value) {
    if (!['right', 'center', 'left'].includes(value)) {
      logging.error(`Alignment must be one of left, right, or center`);
      return false;
    }
    return true;
  }

  function checkArray(value, validator) {
    if (value.length !== 3) {
      logging.error(`Array must have 3 values for small, medium, and large screens`);
      return false;
    }
    for (let i = 0; i < 3; i++) {
      if (!validator(value[i])) {
        return false;
      }
    }
    return true;
  }

  function parseArray(value) {
    if (value === undefined || Array.isArray(value)) {
      return value;
    }
    // assume it's a string based on input validation
    return value.split(',').map(val => val.trim());
  }

  /**
   * Grid layout items
   */
  export default {
    name: 'KGridItem',
    mixins: [responsiveWindow],
    props: {
      /**
       * Integer size of the grid item.
       * Represents either number of columns or a percentage.
       */
      size: {
        type: [Number, String],
        required: false,
        validator: checkNumber,
      },
      /**
       * Array of integer sizes of the grid item for small, medium, and large screens.
       * Represents either number of columns or a percentage.
       */
      sizes: {
        type: [Array, String],
        required: false,
        validator(value) {
          return checkArray(parseArray(value), checkNumber);
        },
      },
      /**
       * When true, sizes are interpretted as a percentage.
       * Only 25, 50, 75, and 100 are allowed.
       */
      percentage: {
        type: Boolean,
        default: false,
      },
      /**
       * Specifies text alignment of contents
       */
      alignment: {
        type: String,
        required: false,
        validator: checkAlignment,
      },
      /**
       * Array of alignments for grid item, corresponding to small, medium
       * large screens.
       */
      alignments: {
        type: [Array, String],
        required: false,
        validator(value) {
          return checkArray(parseArray(value), checkAlignment);
        },
      },
    },
    inject: ['gridMetrics'], // provided by the parent grid component
    computed: {
      parsedSizes() {
        return parseArray(this.sizes);
      },
      parsedAlignments() {
        return parseArray(this.alignments);
      },
      responsiveIndex() {
        if (this.windowIsSmall) {
          return 0;
        } else if (this.windowIsMedium) {
          return 1;
        }
        return 2;
      },
      currentSize() {
        if (this.size === undefined && this.parsedSizes === undefined) {
          logging.error(`Pass either a size or a sizes array`);
        }
        if (this.parsedSizes) {
          return parseInt(this.parsedSizes[this.responsiveIndex]);
        }
        return parseInt(this.size);
      },
      currentAlignment() {
        if (this.parsedAlignments) {
          return this.parsedAlignments[this.responsiveIndex];
        }
        return this.alignment;
      },
      unitClass() {
        const size = this.currentSize;
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
        if (this.currentAlignment) {
          // TODO: rename the alignment inputs to 'start' and 'end'
          if (isRtl && this.currentAlignment === 'left') {
            style.textAlign = 'right';
          } else if (isRtl && this.currentAlignment === 'right') {
            style.textAlign = 'left';
          } else {
            style.textAlign = this.currentAlignment;
          }
        }
        return style;
      },
      validInputs() {
        if (!this.gridMetrics || !this.gridMetrics.numCols || !this.gridMetrics.gutterWidth) {
          logging.error('Grid metrics were not provided by parent');
          return false;
        }
        if (this.size !== undefined && this.parsedSizes !== undefined) {
          logging.error("Pass either a single item or an array, but not both for 'size'");
          return false;
        }
        if (this.alignment !== undefined && this.parsedAlignments !== undefined) {
          logging.error("Pass either a single item or an array, but not both for 'alignment'");
          return false;
        }
        const size = this.currentSize;
        const numCols = this.gridMetrics.numCols;
        if (this.percentage) {
          if (![25, 50, 75, 100].includes(size)) {
            logging.error(`Size (${size}) is not a valid percentage`);
            return false;
          }
          if (numCols % 4) {
            logging.error(`Number of columns (${numCols}) is not a multiple of 4`);
            return false;
          }
        } else {
          if (size > numCols) {
            logging.error(`Size (${size}) is larger than grid (${numCols})`);
            return false;
          }
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
