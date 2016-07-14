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

  @require '../learn'
  @require 'jeet'

  grid-auto-adjust()
    for $n-cols, $i in $n-cols-array
      $grid-width = grid-width($n-cols)
      if($i)
        @media (min-width: breakpoint($grid-width))
          column(1/$n-cols, uncycle: $n-cols-array[$i-1], cycle: $n-cols, gutter: $card-gutter/$grid-width)
      @media (min-width: breakpoint($grid-width))
        column(1/$n-cols, cycle: $n-cols, gutter: $card-gutter/$grid-width)

  // @stylint off
  .card-grid > *
    grid-auto-adjust()
  // @stylint on

</style>


<style lang="stylus" scoped>

  @require 'jeet'

  h2
    margin-top: 0

  .card-grid
    cf()

</style>
