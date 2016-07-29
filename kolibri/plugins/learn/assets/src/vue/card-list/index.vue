<template>

  <section>
    <h3>{{header}}</h3>
    <div class="card-list">
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

  @require '../learn.styl'
  @require 'jeet'

  // Disable styling to make this a more generic container

  // @stylint off
  .card-list > *
  // @stylint on

    margin-bottom: $list-gutter
    column(1, cycle: 1, gutter: 0)
    min-width: $list-width

    // Assumes least to greatest
    for $n-cols, $i in $n-cols-list-array
      $grid-list-width = grid-list-width($n-cols)

      if($i)
        // We're only defining the min-width for this, so we need to uncycle
        // the column widths that are defined "on top" of this one
        @media (min-width: breakpoint($grid-list-width))
          column(1/$n-cols, uncycle: $n-cols-list-array[($i-1)], cycle: $n-cols, gutter: $list-gutter/$grid-list-width)

      // The highest level shouldn't need to uncycle anything.
      @media (min-width: breakpoint($grid-list-width))
        column(1/$n-cols, cycle: $n-cols, gutter: $list-gutter/$grid-list-width)

      // Only functions as intended when there are 2 different sizes, how it's
      // working now is beyond me. Need a refactor.

</style>


<style lang="stylus" scoped>

  @require 'jeet'

  h2
    margin-top: 0

  .card-list
    cf()

</style>
