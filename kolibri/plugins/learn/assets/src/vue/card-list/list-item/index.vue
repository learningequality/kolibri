<template>

  <a class='root'>
    <div class='thumb-wrapper'>
      <slot></slot>
    </div>
    <div class='text'>
      <span class="title">{{ title }}</span>
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

  $thumb-width = 60px

  .root
    display: block
    width: $list-width
    height: $list-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius

  .thumb-wrapper
    position: relative
    display: block
    float: left
    width: $thumb-width
    height: $list-height
    border-radius: $radius 0 0  $radius
    overflow: hidden

  .text
    position: relative
    display: block
    width: 100%
    height: $list-height
    padding: 0.6em
    font-size: 0.9rem
    font-weight: bold
    color: $core-text-default

  .title
    position: absolute
    top: 50%
    transform: translateY(-50%)

</style>
