<template>

  <KFixedGridItem :span="currentSpan" :alignment="currentAlignment">
    <slot></slot>
  </KFixedGridItem>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import logger from 'kolibri.lib.logging';
  import KFixedGridItem from './KFixedGridItem';
  import { validateAlignment, validateSpan } from './common';

  const logging = logger.getLogger(__filename);

  function choose(preferred, backup) {
    return preferred ? preferred : backup;
  }

  function validateLayoutObject(obj) {
    const allowed = ['span', 'alignment'];
    for (const key in obj) {
      if (!allowed.includes(key)) {
        logging.error(`Unexpected layout object property: '${key}'`);
        return false;
      }
    }
    if (obj.span && !validateSpan(obj.span)) {
      return false;
    }
    if (obj.alignment && !validateAlignment(obj.alignment)) {
      return false;
    }
    return true;
  }

  /**
   * Responsive grid item used with KGrid.
   *
   * Accepts "layout objects" as props, which can define values for  'span',
   * 'alignment', or both.
   *
   * If no span is defined for a particular layout, the item will span the full
   * width of the grid.
   *
   * If no alignment is defined for a particular layout, the item's contents
   * will be left-aligned.
   */
  export default {
    name: 'KGridItem',
    components: { KFixedGridItem },
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * Default layout object, for all grid sizes
       */
      layout: {
        type: Object,
        default: () => ({}),
        validator: validateLayoutObject,
      },
      /**
       * Layout object for small, 4-column layouts
       */
      layout4: {
        type: Object,
        default: () => ({}),
        validator: validateLayoutObject,
      },
      /**
       * Layout object for medium, 8-column layouts
       */
      layout8: {
        type: Object,
        default: () => ({}),
        validator: validateLayoutObject,
      },
      /**
       * Layout object for large, 12-column layouts
       */
      layout12: {
        type: Object,
        default: () => ({}),
        validator: validateLayoutObject,
      },
    },
    inject: ['gridMetrics'], // provided by the parent grid component
    computed: {
      defaultSpan() {
        return choose(this.layout.span, this.gridMetrics.numCols);
      },
      defaultAlignment() {
        return choose(this.layout.alignment, 'left');
      },
      currentSpan() {
        if (this.windowIsSmall) {
          return choose(this.layout4.span, this.defaultSpan);
        } else if (this.windowIsMedium) {
          return choose(this.layout8.span, this.defaultSpan);
        }
        return choose(this.layout12.span, this.defaultSpan);
      },
      currentAlignment() {
        if (this.windowIsSmall) {
          return choose(this.layout4.alignment, this.defaultAlignment);
        } else if (this.windowIsMedium) {
          return choose(this.layout8.alignment, this.defaultAlignment);
        }
        return choose(this.layout12.alignment, this.defaultAlignment);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
