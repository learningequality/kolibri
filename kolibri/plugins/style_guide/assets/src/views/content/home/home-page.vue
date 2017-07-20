<template>

  <div class="intro">
      <h1>Welcome to the Kolibri Style Guide</h1>
      <p>This is a resource for developers and designers.</p>
  </div>

</template>


<script>

  export default {};

</script>


<style lang="stylus" scoped>

  @require '../../../styles/style-guide.styl'

  // TODO: dry up this shared styling
  .intro
    margin-left: $sidenav-width
    padding: 32px
    h1
      line-height: 1.7em

</style>
