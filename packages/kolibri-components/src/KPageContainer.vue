<template>

  <div
    class="page-container"
    :class="classes"
    :style="{backgroundColor: $themeTokens.surface, marginTop: `${topMargin}px`}"
  >
    <slot></slot>
  </div>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';

  export default {
    name: 'KPageContainer',
    mixins: [KResponsiveWindowMixin],
    props: {
      // If true, removes the padding inside the container
      noPadding: {
        type: Boolean,
        default: false,
      },
      topMargin: {
        type: Number,
        default: 24,
      },
    },
    computed: {
      classes() {
        return {
          small: this.windowIsSmall,
          'no-padding': this.noPadding,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .page-container {
    @extend %dropshadow-1dp;

    padding: 8px 24px 24px;
    overflow-x: auto;
    border-radius: 4px;
  }

  .no-padding {
    padding: 0;
  }

  .page-container.small {
    padding: 8px 16px 16px;
    margin-top: 0;
  }

</style>
