<template>

  <div class="page-header">
    <router-link :to="'/style_guide/'" >
      <h1>Kolibri Style Guide</h1>
    </router-link>
  </div>

</template>


<script>

  export default {};

</script>


<style lang="stylus" scoped>

  @import '../../styles/core-theme.styl'

  .page-header
    position: fixed
    left: 0
    right: 0
    top: 0
    z-index: 4
    background: #212121
    color: white
    padding-left: 1em
    a
      color: white
      text-decoration: none
      h1
        display: inline-block
        font-size: 1.25em

</style>
