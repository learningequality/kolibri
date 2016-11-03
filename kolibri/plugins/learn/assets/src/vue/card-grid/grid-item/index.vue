<template>

  <a class="root">
    <div class="thumb-wrapper">
      <slot></slot>
    </div>
    <div class="content-icon-wrapper">
    <content-icon
      v-if="kind"
      :kind="kind">
    </content-icon>
      </div>
    <div class="text">
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
      kind: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '../../learn.styl'

  $thumb-width = $horizontal-card-height

  .root
    display: block
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius
    text-decoration: none
    @media screen and (max-width: $medium-breakpoint)
      width: $horizontal-card-width
      height: $horizontal-card-height

  .thumb-wrapper
    position: relative
    display: block
    width: 100%
    height: $thumbnail-height
    border-radius: $radius $radius 0 0
    overflow: hidden
    @media screen and (max-width: $medium-breakpoint)
      float: left
      width: $thumb-width
      height: $horizontal-card-height
      border-radius: $radius 0 0  $radius

  .text
    display: block
    display: -webkit-box
    -webkit-line-clamp: 3 // Enhance Chrome, doesn't work on other browsers
    -webkit-box-orient: vertical // Enhance Chrome, doesn't work on other browsers
    width: 100%
    max-height: 68px
    padding: 0.6em
    font-size: 0.9rem
    line-height: 1.2rem
    color: $core-text-default
    overflow: hidden
    text-overflow: ellipsis
    display: inline
    @media screen and (max-width: $medium-breakpoint)
      float: right
      max-height: 86px
      width: $horizontal-card-width - $thumb-width
      -webkit-line-clamp: 4 // Enhance Chrome, doesn't work on other browsers

  .content-icon-wrapper
    width: 2em
    height: 100%
    display: inline
    padding: 0.6em

</style>
