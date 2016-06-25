<template>

  <div>
    <!-- <kolibri-nav></kolibri-nav> -->
    <!-- <header class="base-header"><h1>Kolibri Learn</h1></header> -->
    <main>
      <slot></slot>
    </main>
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

  .base-header h1
    color: $core-action-normal
    text-align: center
    font-size: smaller

</style>
