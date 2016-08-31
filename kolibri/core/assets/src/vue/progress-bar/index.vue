<template>

  <div>
    <div class="visuallyhidden" id="progress-bar-label">{{ $tr('yourProgressIs') }}</div>
    <div class="progress-bar-wrapper"
      role="progressbar"
      aria-labelledby="progress-bar-label"
      :aria-valuenow="progressPercent"
      aria-valuemin="0"
      aria-valuemax="100">
      <div class="progress-bar-complete" v-bind:style="{ width: progressPercent + '%' }"></div>
    </div>
    <p class="progress-bar-text">{{ progressPercent + '% ' + $tr('complete') }}</p>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'progressBar',
    $trs: {
      yourProgressIs: 'Your progress is:',
      complete: 'Complete',
    },
    props: {
      progressPercent: {
        type: Number,
        default: 0,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .progress-bar-wrapper
    display: inline-block
    position: relative
    width: 200px
    height: 0.75em
    background-color: $core-action-light

  .progress-bar-complete
    height: 100%
    width: 0
    background-color: $core-action-normal
    transition: width, 0.25s, ease

  .progress-bar-text
    margin: 0

</style>
