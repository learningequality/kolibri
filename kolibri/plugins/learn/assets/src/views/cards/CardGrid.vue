<template>

  <div class="cards-grid" :class="[gridClass, levelClass]">
    <slot></slot>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';

  // Add new enums as the designs call for different grid styles
  const GRID_TYPE_1 = 1;
  const GRID_TYPE_2 = 2;

  export default {
    name: 'CardGrid',
    mixins: [responsiveWindowMixin],
    props: {
      gridType: {
        type: Number,
        required: false,
        default: GRID_TYPE_1,
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
    // Negates the margin on the individual cards
    margin: -$grid-margin;
  }

</style>
