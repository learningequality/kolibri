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

  $thumb-width = $card-height * 3.0 / 2.5;

  .root
    display: block
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius

  .root:focus
    background-color: $core-action-light
    outline: none

  .thumb-wrapper
    position: relative
    display: block
    width: 100%
    height: $thumbnail-height
    border-radius: $radius $radius 0 0
    overflow: hidden

  .text
    display: block
    width: 100%
    height: $card-height - $thumbnail-height
    padding: 0.6em
    font-size: 0.86rem
    line-height: 1.1rem
    font-weight: bold
    color: $core-text-default

</style>
