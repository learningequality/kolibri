<template>

  <kolibri-nav></kolibri-nav>
  <main>
    <slot></slot>
  </main>

</template>

<script>
export default {
  components: {
    'kolibri-nav': require('./navigation.vue'),
  },
};
</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  main
    margin: 10px

</style>
