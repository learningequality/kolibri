<template>

  <div
    class="cards-grid"
    :class="[gridClass, levelClass]"
  >
    <slot></slot>
  </div>

</template>


<script>

  import { computed, provide } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  const GRID_TYPE_1 = 1;
  const GRID_TYPE_2 = 2;

  // Keep in sync with the per-row widths in the <style> block below.
  function cardsPerRow(gridType, breakpoint) {
    if (gridType === GRID_TYPE_2) {
      if (breakpoint <= 0) return 1;
      if (breakpoint === 1) return 2;
      if (breakpoint === 2) return 3;
      if (breakpoint === 3) return 4;
      return 5;
    }
    if (breakpoint <= 1) return 1;
    if (breakpoint === 2) return 2;
    if (breakpoint === 3) return 3;
    return 4;
  }

  export default {
    name: 'CardGrid',
    setup(props) {
      const { windowBreakpoint } = useKResponsiveWindow();
      // Provide the width that KCard expects via inject, matching the
      // calc applied to direct children by the scoped styles.
      const gridItemStyle = computed(() => ({
        width: `calc((100% / ${cardsPerRow(props.gridType, windowBreakpoint.value)}) - 16px)`,
      }));
      provide('gridItemStyle', gridItemStyle);
      return { windowBreakpoint };
    },
    props: {
      /**
       * `1` or `2`
       *
       * The following number of cards will
       * be displayed on one row:
       *
       * Grid type `1`
       *   Level 4+: 4 cards
       *   Level 3: 3 cards
       *   Level 2: 2 cards
       *   Level 1: 1 cards
       *   Level 0: 1 card
       *
       * Grid type `2`
       *   Level 4+: 5 cards
       *   Level 3: 4 cards
       *   Level 2: 3 cards
       *   Level 1: 2 cards
       *   Level 0: 1 card
       */
      gridType: {
        type: Number,
        required: false,
        default: GRID_TYPE_1,
        validator(value) {
          return [GRID_TYPE_1, GRID_TYPE_2].includes(value);
        },
      },
    },
    computed: {
      gridClass() {
        switch (this.gridType) {
          case GRID_TYPE_1:
            return 'grid-type-1';
          case GRID_TYPE_2:
            return 'grid-type-2';
          default:
            return 'grid-type-1';
        }
      },
      levelClass() {
        return `level-${this.windowBreakpoint}`;
      },
    },
  };

</script>


<style lang="scss" scoped>

  $grid-margin: 8px;
  $margins: $grid-margin * 2;

  @mixin per-row($n) {
    > * {
      width: calc((100% / #{$n}) - #{$margins});
    }
  }

  .cards-grid > * {
    margin: $grid-margin;
  }

  .grid-type-1 {
    @include per-row(4);

    &.level-3 {
      @include per-row(3);
    }

    &.level-2 {
      @include per-row(2);
    }

    &.level-1,
    &.level-0 {
      @include per-row(1);
    }
  }

  .grid-type-2 {
    @include per-row(5);

    &.level-3 {
      @include per-row(4);
    }

    &.level-2 {
      @include per-row(3);
    }

    &.level-1 {
      @include per-row(2);
    }

    &.level-0 {
      @include per-row(1);
    }
  }

  .cards-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
  }

</style>
