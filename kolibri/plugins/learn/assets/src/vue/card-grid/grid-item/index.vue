<template>

  <router-link :to="link">
    <div class="wrapper">
      <div class="card-thumbnail">
        <slot/>
        <div class="progress-icon-wrapper">
          <progress-icon :progress="progress"/>
        </div>
      </div>
      <div class="card-content">
        <div class="text">
          <content-icon
          class="content-icon"
          v-if="kind"
          :kind="kind"/>
          {{ title }}
        </div>
      </div>
    </div>
  </router-link>

</template>


<script>

  module.exports = {
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
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

  @require '~kolibri.styles.definitions'
  @require '../../learn.styl'

  $thumb-width = 100px

  .card
    overflow: hidden
    width: $card-width
    height: $card-height
    border-radius: $radius
    background-color: $core-bg-light

  .card-thumbnail
    position: relative
    height: 122px

  .text
    -webkit-line-clamp: 3 // Enhance Chrome, doesn't work on other browsers
    -webkit-box-orient: vertical // Enhance Chrome, doesn't work on other browsers
    overflow: hidden
    margin-left: 35px
    max-height: 68px
    width: auto
    color: $core-text-default
    text-overflow: ellipsis
    font-size: 0.9rem
    line-height: 1.2rem

  .content-icon
    position: absolute
    top: 10px
    left: 10px
    font-size: 1.5em

  .card-content
    position: relative
    padding: 10px

  a
    text-decoration: none

  .progress-icon-wrapper
    position: absolute
    top: 0.25em
    right: 0.25em
    width: 1.5em
    height: 1.5em

  .wrapper
    background-color: $core-bg-light

</style>
