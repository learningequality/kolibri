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
    for $preset, $i in $card-presets
      $min-width = ($card-width * $preset) + ($card-gutter * ($preset - 1))
      if($i)
        @media (min-width:$min-width)
          column(1/$preset, uncycle: $card-presets[$i-1], cycle: $preset, gutter: $card-gutter/$min-width)

      @media (min-width:$min-width)
        column(1/$preset, cycle: $preset, gutter: $card-gutter/$min-width)

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
