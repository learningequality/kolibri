<template>

  <ui-progress-linear
    class="k-linear-loader"
    :class="{ delay }"
    :type="progress ? 'determinate' : 'indeterminate'"
    :progress="progress"
  />

</template>


<script>

  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';

  export default {
    name: 'kLinearLoader',
    components: {
      uiProgressLinear,
    },
    props: {
      delay: {
        type: Boolean,
        required: true,
      },
      type: {
        type: String,
        required: true,
        validator(val) {
          return val === 'determinate' || val === 'indeterminate';
        },
      },
      progress: {
        type: Number,
        required: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .k-linear-loader
    animation: fadeIn
    animation-fill-mode: backwards
    animation-duration: 0s

  .k-linear-loader.ui-progress-linear
    background-color: rgba($core-loading, 0.4)

  .k-linear-loader
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
