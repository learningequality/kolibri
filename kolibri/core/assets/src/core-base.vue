<template>

  <!-- <kolibri-nav></kolibri-nav> -->
  <div>
    <slot></slot>
  </div>

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
