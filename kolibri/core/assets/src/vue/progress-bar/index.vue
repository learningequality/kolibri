<template>

  <div>
    <div class="visuallyhidden" id="progress-bar-label">{{ $tr('yourProgressIs') }}</div>
    <div class="progress-bar-wrapper"
         role="progressbar"
         aria-labelledby="progress-bar-label"
         :aria-valuenow="progressPercent"
         aria-valuemin="0"
         aria-valuemax="100">
      <div class="progress-bar-complete" :style="{ width: progressPercent + '%',  backgroundColor: color}"></div>
    </div>
    <p class="progress-bar-text">{{ progressPercent + '% ' }}</p>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'progressBar',
    $trs: {
      yourProgressIs: 'Your progress is:',
    },
    props: {
      progressPercent: {
        type: Number,
        required: true,
        validator(value) {
          return (value >= 0) && (value <= 100);
        },
      },
      color: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .progress-bar-wrapper
    display: inline-block
    position: relative
    width: 100%
    height: 0.75em
    background-color: #E0E0E0

  .progress-bar-complete
    height: 100%
    width: 0
    background-color: $core-action-normal
    transition: width, 0.25s, ease

  .progress-bar-text
    margin: 0
    text-align: right

</style>
