<template>

  <ui-progress-linear
    class="k-indeterminate-linear-indicator"
    :class="{ delay }"
  />

</template>


<script>

  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';

  export default {
    name: 'kIndeterminateLinearIndicator',
    components: {
      uiProgressLinear,
    },
    props: {
      delay: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .k-indeterminate-linear-indicator
    animation: fadeIn
    animation-fill-mode: backwards
    animation-duration: 0s

  .k-indeterminate-linear-indicator.ui-progress-linear
    background-color: rgba($core-loading, 0.4)

  .k-indeterminate-linear-indicator
    >>>.ui-progress-linear__progress-bar
      background-color: $core-loading

  .delay
    animation-delay: 1s

  @keyframes fadeIn
    from
      opacity: 0
    to
      opacity: 1

</style>
