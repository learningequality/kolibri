<template>

  <router-link :to="link">
    <div class="card">
      <div class="card-thumbnail">
        <slot/>
        <div class="progress-icon-wrapper">
          <progress-icon :progress="progress"/>
        </div>
      </div>
      <div class="card-content">
        <content-icon
          class="outer-content-icon"
          v-if="kind"
          :kind="kind"/>
        <div class="text">
          {{ title }}
        </div>
      </div>
    </div>
  </router-link>

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
      progress: {
        type: Number,
        required: false,
      },
      link: {
        type: Object,
        required: true,
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
    overflow: hidden
    background-color: $core-bg-light
    border-radius: $radius
    @media screen and (max-width: $medium-breakpoint)
      width: 100%
      height: 175px

  .card-thumbnail
    height: $thumbnail-height
    position: relative

  .text
    -webkit-line-clamp: 3 // Enhance Chrome, doesn't work on other browsers
    -webkit-box-orient: vertical // Enhance Chrome, doesn't work on other browsers
    width: auto
    max-height: 68px
    margin-left: 35px
    overflow: hidden
    font-size: 0.9rem
    line-height: 1.2rem
    text-overflow: ellipsis
    color: $core-text-default

  .outer-content-icon
    position: absolute
    left: 10px
    top: 10px

  .card-content
    padding: 10px
    position: relative

  a
    text-decoration: none

  .progress-icon-wrapper
    position: absolute
    top: 0.25em
    right: 0.25em
    width: 1.5em
    height: 1.5em

</style>
