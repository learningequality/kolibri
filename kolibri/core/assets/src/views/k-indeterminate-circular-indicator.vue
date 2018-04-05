<template>

  <ui-progress-circular
    class="k-indeterminate-circular-indicator"
    :class="{ delay }"
  />

</template>


<script>

  import UiProgressCircular from 'keen-ui/src/UiProgressCircular';

  export default {
    name: 'kIndeterminateCircularIndicator',
    components: {
      UiProgressCircular,
    },
    props: {
      delay: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .k-indeterminate-circular-indicator
    margin: 0 auto
    animation: fadeIn
    animation-fill-mode: both
    animation-duration: 1s

    >>>.ui-progress-circular__indeterminate-path
      stroke: $core-loading

  .delay
    animation-delay: 1s

  @keyframes fadeIn
    from
      opacity: 0
    to
      opacity: 1

</style>
