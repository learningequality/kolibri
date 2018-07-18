<template>

  <div :class="unitClass" :style="computedStyle">
    <div :class="{ debug: gridMetrics.debug }">
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

  function checkInputs(singularValue, arrayValue, propName) {
    if (singularValue !== undefined && arrayValue !== undefined) {
      logging.error(`Pass either a single item or an array, but not both for '${propName}'`);
    }
  }

  /**
   * Grid layout items
   */
  export default {
    name: 'kGridItem',
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
        type: Array,
        required: false,
        validator(value) {
          return checkArray(value, checkNumber);
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
        type: String,
        required: false,
        validator(value) {
          return checkArray(value, checkAlignment);
        },
      },
    },
    inject: ['gridMetrics'], // provided by the parent grid component
    computed: {
      currentSize() {
        checkInputs(this.size, this.sizes, 'size');
        if (this.size === undefined && this.sizes === undefined) {
          logging.error(`Pass either a size or a sizes array`);
        }
        if (this.sizes) {
          return parseInt(this.getResponsiveValue(this.sizes));
        }
        return parseInt(this.size);
      },
      currentAlignment() {
        checkInputs(this.alignment, this.alignments, 'alignment');
        if (this.alignments) {
          return this.getResponsiveValue(this.alignments);
        }
        return this.alignment;
      },
      sizeIn24ths() {
        const size = this.currentSize;
        // handle percentage
        if (this.percentage) {
          if (![25, 50, 75, 100].includes(size)) {
            logging.error(`Size (${size}) is not a valid percentage`);
          }
          return (24 * size) / 100;
        }
        // handle size in number of columns
        if (size > this.gridMetrics.numCols) {
          logging.error(`Size (${size}) is larger than grid (${this.gridMetrics.numCols})`);
        }
        return (24 * size) / this.gridMetrics.numCols;
      },
      unitClass() {
        return `pure-u-${this.sizeIn24ths}-24`;
      },
      computedStyle() {
        const padding = `${this.gridMetrics.gutterWidth / 2}px`;
        const style = {
          paddingLeft: padding,
          paddingRight: padding,
        };
        if (this.currentAlignment) {
          style.textAlign = this.currentAlignment;
        }
        return style;
      },
    },
    mounted() {
      // Intentionally depends on parent component to mimic css grid API
      if (!this.gridMetrics.numCols || !this.gridMetrics.gutterWidth) {
        logging.error('Grid metrics were not provided by parent');
      }
    },
    methods: {
      getResponsiveValue(array) {
        if (this.windowIsSmall) {
          return array[0];
        } else if (this.windowIsMedium) {
          return array[1];
        }
        return array[2];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .debug {
    border: 1px solid #e6c003;
  }

</style>
