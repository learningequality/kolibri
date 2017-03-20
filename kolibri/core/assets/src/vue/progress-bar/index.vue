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
        return Math.max(Math.min(this.progress * 100, 100), 0);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .wrapper
    position: relative
    padding-right: 40px
    white-space: nowrap

  .progress-bar-wrapper
    position: relative
    display: inline-block
    float: left
    overflow: hidden
    margin-right: 5px
    max-width: 125px
    width: 100%
    height: 1.2em
    border-radius: 15px
    background-color: #E0E0E0

  .progress-bar-complete
    width: 0
    height: 100%
    background-color: $core-action-normal
    transition: width, $core-time, ease

  .progress-bar-text
    position: relative
    right: 0
    display: inline-block
    width: 30px
    text-align: left

</style>
