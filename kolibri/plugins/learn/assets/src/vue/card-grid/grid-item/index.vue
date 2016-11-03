<template>

  <a>
    <div class="card">
      <div class="card-thumbnail">
        <slot></slot>
      </div>
      <div class="card-content">
        <div class="content-icon-wrapper">
          <content-icon
            v-if="kind"
            :kind="kind">
          </content-icon>
        </div>
        <div class="text">
          {{ title }}
        </div>
      </div>
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

  .card
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    overflow: hidden
    border-radius: $radius
    @media screen and (max-width: $medium-breakpoint)
      width: 100%
      height: 175px

  .card-thumbnail
    height: $thumbnail-height

  .text
    -webkit-line-clamp: 3 // Enhance Chrome, doesn't work on other browsers
    -webkit-box-orient: vertical // Enhance Chrome, doesn't work on other browsers
    max-height: 68px
    font-size: 0.9rem
    line-height: 1.2rem
    color: $core-text-default
    overflow: hidden
    text-overflow: ellipsis
    margin-left: 20%
    width: auto

  .content-icon-wrapper
    width: 25px
    height: 100%
    float: left

  .card-content
    padding: 10px

  a
    text-decoration: none

</style>
