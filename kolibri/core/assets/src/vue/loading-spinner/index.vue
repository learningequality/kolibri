<template>

  <div>
    <div class="loading-spinner-wrapper">
      <div class="loading-spinner"></div>
    </div>
  </div>

</template>


<script>

  module.exports = {

  };

</script>


<style lang="stylus" scoped>

  .loading-spinner-wrapper
    width: 100%
    height: 100%
    position: relative
    opacity: 0
    animation-duration: 0s
    animation-delay: 250ms
    animation-name: delaydisplay
    animation-fill-mode: forwards

  @keyframes delaydisplay
    from
      opacity: 0
    to
      opacity: 1

  .loading-spinner
    width: 50%
    height: 50%
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    background: url('loading-spinner.gif') no-repeat center
    background-size: contain

</style>
