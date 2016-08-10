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
  @require 'jeet'

  $min-height = 60px         // min card height

  .root
    position: relative
    display: block
    min-height: 60px
    background-color: $core-bg-light
    border-radius: $radius
    display: table
    width: 100%

  .thumb-wrapper
    position: absolute
    left: 0.4em
    width: $min-height
    height: $min-height
    border-radius: $radius 0 0 $radius

  .text
    position: relative
    width: 100%
    font-size: 0.9rem
    font-weight: bold
    color: $core-text-default
    display: table-row

  .title
    display: table-cell
    width: 100%
    height: $min-height
    padding: 0.8em
    padding-left: $min-height
    vertical-align: middle

</style>
