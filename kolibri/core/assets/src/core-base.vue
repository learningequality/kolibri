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


<style lang="stylus">
  /* These global styles apply to everything */

  html, body
    font-family: sans-serif
    margin:0
    padding:0
    box-sizing: border-box
</style>
