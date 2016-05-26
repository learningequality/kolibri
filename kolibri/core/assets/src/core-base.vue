<template>

  <kolibri-nav></kolibri-nav>
  <main>
    <slot></slot>
  </main>
  <footer>
    Call a podiatrist – I'm in a footer!
  </footer>

</template>

<script>
export default {
  components: {
    'kolibri-nav': require('./navigation.vue'),
  },
};
</script>


<style lang="stylus" scoped>

  @require 'theme.styl'

  main
    margin: 10px

  footer
    background-color: $bg-light
    bottom: 1vh
    position: fixed
    padding: 10px
    width: 100%

</style>
