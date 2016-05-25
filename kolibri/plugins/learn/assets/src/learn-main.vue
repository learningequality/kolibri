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

  @require '~theme.styl'

  .alert
    color: $text-alert
    background-color: $text-alert-bg

</style>
