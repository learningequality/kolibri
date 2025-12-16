<template>

  <div
    class="cards-grid"
    :class="[gridClass, levelClass]"
  >
    <slot></slot>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  const GRID_TYPE_1 = 1;
  const GRID_TYPE_2 = 2;

  export default {
    name: 'CardGrid',
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
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
       *   Level 3+: 3 cards
       *   Level 2: 2 cards
       *   Level 1: 1 cards
       *   Level 0: 1 card
       *
       * Grid type `2`
       *   Level 3+: 4 cards
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
    @include per-row(3);

    &.level-2 {
      @include per-row(2);
    }

    &.level-1,
    &.level-0 {
      @include per-row(1);
    }
  }

  .grid-type-2 {
    @include per-row(4);

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
