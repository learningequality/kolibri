<template>

  <section>
    <h2>{{header}}</h2>
    <div class="card-grid">
      <slot></slot>
    </div>
  </section>

</template>


<script>

  module.exports = {
    props: [
      'header',
    ],
  };

</script>


<style lang="stylus">

  @import 'jeet'

  // @stylint off
  .card-grid > *
    column(1/4, cycle:4)
  // @stylint on

</style>


<style lang="stylus" scoped>

  @import 'jeet'

  .card-grid
    cf()

</style>
