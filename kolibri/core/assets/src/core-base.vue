<template>

  <header>
    <kolibri-nav></kolibri-nav>
  </header>
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

  $bg-color = #E3E3F3

  header
    background-color: $bg-color
    display: flex
    justify-content: space-between
    padding: 10px

  main
    margin: 10px

  footer
    bottom: 1vh
    position: fixed
    padding: 10px

</style>
