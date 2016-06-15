<template>

  <core-base>
    <h1>
      Learn App
    </h1>
    <p>content</p>
    <p class="alert">alert!</p>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .alert
    color: $core-text-alert
    background-color: $core-text-alert-bg

</style>
