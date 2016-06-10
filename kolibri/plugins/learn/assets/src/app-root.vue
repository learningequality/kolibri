<template>

  <core-base>
    <topic-page></topic-page>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'topic-page': require('./topic-page'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
