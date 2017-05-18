<template>

  <router-link :to="link" class="card">

    <div class="card-thumbnail" :style="backgroundImg">
      <div class="card-progress-icon-wrapper">
        <progress-icon :progress="progress"/>
      </div>

      <div class="card-content-icon-background" :style="contentIconBackground"></div>
      <div class="card-content-icon-wrapper">
        <content-icon :kind="kind" class="card-content-icon"/>
      </div>
    </div>

    <div class="card-content">
      <h3 class="card-title">{{ title }}</h3>
      <h4 class="card-subtitle"></h4>
    </div>
  </router-link>

</template>


<script>

  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
      subtitle: {
        type: String,
        required: false,
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
        validator: validateLinkObject,
      },
      thumbnail: {
        type: String,
        required: false,
      },
    },
    computed: {
      backgroundImg() {
        return { backgroundImage: `url('${this.thumbnail}')` };
      },
      contentIconBackground() {
        let color = '#262626';
        if (this.kind === 'topics') {
          color = '#ffca28';
        } else if (this.kind === 'exercise') {
          color = '#33A369';
        } else if (this.kind === 'video') {
          color = '#3938A5';
        } else if (this.kind === 'audio') {
          color = '#E65997';
        } else if (this.kind === 'document') {
          color = '#ED2828';
        } else if (this.kind === 'html5') {
          color = '#FF8B41';
        }
        return { borderColor: `${color} transparent transparent transparent` };
      },
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $card-width = 210px
  $card-height = $card-width
  $card-thumbnail-ratio = (9 / 16)
  $card-thumbnail-height = $card-width * $card-thumbnail-ratio
  $card-content-height = $card-height - $card-thumbnail-height
  $card-content-padding = ($card-width / (320 / 24))
  $card-elevation-resting = 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12)
  $card-elevation-raised = 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2)

  a
    text-decoration: none

  .card
    display: inline-block
    width: $card-width
    height: $card-height
    border-radius: 2px
    background-color: $core-bg-light
    box-shadow: $card-elevation-resting
    &:hover, &:focus
      box-shadow: $card-elevation-raised

  .card-thumbnail
    position: relative
    width: $card-width
    height: $card-thumbnail-height
    background-size: cover
    background-position: center
    background-color: black

  .card-progress-icon-wrapper
    position: absolute
    top: 0.25em
    right: 0.25em
    width: 1.5em
    height: 1.5em

  .card-content-icon-background
    position: absolute
    top: 0
    left: 0
    width: 0
    height: 0
    border-style: solid
    border-width: 3.5em 3.5em 0 0

  .card-content-icon-wrapper
    position: absolute
    top: 0
    left: 0
    padding: 0.25em
    color: white

  .card-content-icon
    font-size: 1.25em

  .card-content
    padding: $card-content-padding
    height: $card-content-height
    color: $core-text-default

  .card-title, .card-subtitle
    margin: 0

  .card-title
    overflow: hidden
    line-height: ($card-width / (320 / 32))
    height: ($card-width / (320 / 64))
    font-size: ($card-width / (320 / 24))

  .card-subtitle
    padding-top: ($card-width / (320 / 16))
    font-size: ($card-width / (320 / 14))
    color: $core-text-annotation

</style>
