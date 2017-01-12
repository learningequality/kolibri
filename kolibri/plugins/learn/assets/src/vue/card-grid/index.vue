<template>

  <div>
    <div class="header">
      <h3 v-if="header">{{header}}</h3>
      <slot name="headerbox"/>
    </div>
    <div class="card-grid">
      <slot/>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: [
      'header',
    ],
  };

</script>


<style lang="stylus">

  @require '../learn.styl'
  @require 'jeet'

  // Disable styling to make this a more generic container

  // @stylint off
  .card-grid > *
  // @stylint on

    margin-bottom: $card-gutter
    column(1, cycle: 1, gutter: 0)
    min-width: $card-width

    // Assumes least to greatest
    for $n-cols, $i in $n-cols-array
      $grid-width = grid-width($n-cols)

      if($i)
        // We're only defining the min-width for this, so we need to uncycle
        // the column widths that are defined "on top" of this one
        @media (min-width: breakpoint($grid-width))
          column(1/$n-cols, uncycle: $n-cols-array[($i-1)], cycle: $n-cols, gutter: $card-gutter/$grid-width)

      // The highest level shouldn't need to uncycle anything.
      @media (min-width: breakpoint($grid-width))
        column(1/$n-cols, cycle: $n-cols, gutter: $card-gutter/$grid-width)

      // Only functions as intended when there are 2 different sizes, how it's
      // working now is beyond me. Need a refactor.

</style>


<style lang="stylus" scoped>

  @require 'jeet'

  .header
    margin-top: 2em
    margin-bottom: 1.4em

  .header h3
    display: inline

  .card-grid
    cf()

</style>
