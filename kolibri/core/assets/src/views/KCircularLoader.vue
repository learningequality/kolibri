<template>

  <UiProgressCircular
    class="k-circular-loader"
    :class="{ delay }"
  />

</template>


<script>

  import UiProgressCircular from 'keen-ui/src/UiProgressCircular';

  /**
   * Used to show indeterminate loading
   */
  export default {
    name: 'KCircularLoader',
    components: {
      UiProgressCircular,
    },
    props: {
      /**
       * Whether there should be a delay before the loader displays
       */
      delay: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .k-circular-loader {
    margin: 0 auto;
    animation: fadeIn;
    animation-fill-mode: backwards;
    animation-duration: 0s;

    /deep/ .ui-progress-circular__indeterminate-path {
      stroke: $core-loading;
    }
  }

  .delay {
    animation-delay: 1s;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

</style>
