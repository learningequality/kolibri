<template>

  <a class='root'>
    <div class='thumb-wrapper'>
      <slot></slot>
    </div>
    <div class='text'>
      {{ title }}
    </div>
  </a>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../../learn.styl'

  $thumb-width = $horizontal-card-height * 3.0 / 2.5;

  .root
    display: block
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius
    @media screen and (max-width: $portrait-breakpoint)
      width: $horizontal-card-width
      height: $horizontal-card-height

  .thumb-wrapper
    position: relative
    display: block
    width: 100%
    height: $thumbnail-height
    border-radius: $radius $radius 0 0
    overflow: hidden
    @media screen and (max-width: $portrait-breakpoint)
      float: left
      width: $thumb-width
      height: $horizontal-card-height
      border-radius: $radius 0 0  $radius

  .text
    display: block
    width: 100%
    height: $card-height - $thumbnail-height
    padding: 0.6em
    font-size: 0.86rem
    line-height: 1.1rem
    font-weight: bold
    color: $core-text-default
    @media screen and (max-width: $portrait-breakpoint)
      float: right
      width: $horizontal-card-width - $thumb-width
      height: $horizontal-card-height

</style>
