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
  @require '../learn.styl'

  $thumb-width = $card-height * 3.0 / 2.5;
  $border-width = 1px

  .root
    display: block
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius
    transition: border-color $core-time ease-out
    border-width: $border-width
    border-style: solid
    border-color: transparent

    &:hover
      border-color: $core-action-normal


  .thumb-wrapper
    position: relative
    display: block
    float: left
    width: $thumb-width
    height: $card-height
    border-radius: $radius 0 0 $radius
    overflow: hidden

  .text
    display: block
    float: right
    width: $card-width - $thumb-width - 2 * $border-width
    height: $card-height
    padding: 0.6em
    font-size: 0.9rem
    font-weight: bold
    color: $core-text-default

</style>
