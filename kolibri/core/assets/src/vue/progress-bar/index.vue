<template>

  <div class="wrapper">
    <div class="visuallyhidden" id="progress-bar-label">{{ $tr('label') }}</div>
    <div class="progress-bar-wrapper"
         role="progressbar"
         aria-labelledby="progress-bar-label"
         :aria-valuenow="percent"
         aria-valuemin="0"
         aria-valuemax="100">
      <div class="progress-bar-complete" :style="{ width: percent + '%',  backgroundColor: color}"></div>
    </div>
    <div class="progress-bar-text">{{ $tr('pct', [progress]) }}</div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'progressBar',
    $trs: {
      label: 'Progress:',
      pct: '{0, number, percent}',
    },
    props: {
      progress: {
        type: Number,
        required: true,
      },
      color: {
        type: String,
        required: false,
      },
    },
    computed: {
      percent() {
        return Math.min(this.progress * 100, 100);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .wrapper
    position: relative
    white-space: nowrap
    padding-right: 40px

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
    transition: width, $core-time, ease

  .progress-bar-text
    display: inline-block
    position: absolute
    right: 0
    width: 30px
    text-align: right

</style>
