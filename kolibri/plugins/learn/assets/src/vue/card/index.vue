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

  $thumb-width = $card-height * 3.0 / 2;

  .root
    display: block
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius

  .thumb-wrapper
    position: relative
    display: block
    float: left
    width: $thumb-width
    height: $card-height
    border-radius: $radius
    overflow: hidden

  .text
    display: block
    float: right
    width: $card-width - $thumb-width
    height: $card-height
    padding: 0.5em
    font-size: 0.8rem
    font-weight: bold

</style>
