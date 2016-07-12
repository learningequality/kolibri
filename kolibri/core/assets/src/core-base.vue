<template>

  <!-- <kolibri-nav></kolibri-nav> -->
  <main role="main">
    <slot></slot>
  </main>

</template>


<script>

  module.exports = {
    components: {
      'kolibri-nav': require('./navigation.vue'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
