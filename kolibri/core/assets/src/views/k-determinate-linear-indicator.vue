<template>

  <ui-progress-linear
    class="k-determinate-linear-indicator"
    type="determinate"
    :progress="progress"
  />

</template>


<script>

  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';

  export default {
    name: 'kDeterminateLinearIndicator',
    components: {
      uiProgressLinear,
    },
    props: {
      progress: {
        type: Number,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .k-determinate-linear-indicator.ui-progress-linear
    background-color: rgba($core-loading, 0.4)

  .k-determinate-linear-indicator
    >>>.ui-progress-linear__progress-bar
      background-color: $core-loading

</style>
