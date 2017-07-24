<template>

  <router-link :to="link" class="card">

    <div class="card-thumbnail" :style="backgroundImg">
      <content-icon v-if="!thumbnail" :kind="kind" class="card-thumbnail-backup"/>
      <div v-show="progress > 0" class="card-progress-icon-wrapper">
        <progress-icon :progress="progress"/>
      </div>

      <div class="card-content-icon-background" :class="backgroundClass"></div>
      <div class="card-content-icon-wrapper">
        <content-icon :kind="kind" class="card-content-icon"/>
      </div>

      <div class="card-progress-bar-wrapper">
        <div
          class="card-progress-bar"
          :style="{ width: `${progress * 100}%` }"
          :class="{ 'card-progress-bar-mastered': mastered, 'card-progress-bar-progress': inProgress }">
        </div>
      </div>
    </div>

    <div class="card-text">
      <h3 class="card-title">{{ title }}</h3>
      <h4 v-if="subtitle" class="card-subtitle">{{ subtitle }}</h4>
    </div>

  </router-link>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';
  import validateLinkObject from 'kolibri.utils.validateLinkObject';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';

  export default {
    props: {
      title: {
        type: String,
        required: true,
      },
      subtitle: {
        type: String,
        required: false,
      },
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return values(ContentNodeKinds).includes(value);
        },
      },
      progress: {
        type: Number,
        required: true,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
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
      mastered() {
        return this.progress === 1;
      },
      inProgress() {
        return this.progress > 0 && this.progress < 1;
      },
      backgroundImg() {
        if (this.thumbnail) {
          return { backgroundImage: `url('${this.thumbnail}')` };
        }
        return {};
      },
      backgroundClass() {
        if (this.kind === 'exercise') {
          return 'card-content-icon-background-exercise';
        } else if (this.kind === 'video') {
          return 'card-content-icon-background-video';
        } else if (this.kind === 'audio') {
          return 'card-content-icon-background-audio';
        } else if (this.kind === 'document') {
          return 'card-content-icon-background-document';
        } else if (this.kind === 'html5') {
          return 'card-content-icon-background-html5';
        }
        return '';
      },
    },
    components: {
      contentIcon,
      progressIcon,
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $card-width = 210px
  $card-height = $card-width
  $card-thumbnail-ratio = (9 / 16)
  $card-thumbnail-height = $card-width * $card-thumbnail-ratio
  $card-text-height = $card-height - $card-thumbnail-height
  $card-text-padding = ($card-width / (320 / 24))
  $card-elevation-resting = 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12)
  $card-elevation-raised = 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2)
  $elevation-transition = box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)

  a
    text-decoration: none

  .card
    display: inline-block
    width: $card-width
    height: $card-height
    border-radius: 2px
    background-color: $core-bg-light
    box-shadow: $card-elevation-resting
    transition: $elevation-transition
    &:hover, &:focus
      box-shadow: $card-elevation-raised

  .card-thumbnail
    position: relative
    width: 100%
    height: $card-thumbnail-height
    background-size: cover
    background-position: center
    background-color: $core-grey

  .card-thumbnail-backup
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    color: $core-text-annotation
    font-size: ($card-thumbnail-height / 2)

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
    border-top-color: $core-content-topic
    border-right-color: transparent
    border-bottom-color: transparent
    border-left-color: transparent

  .card-content-icon-background-exercise
    border-top-color: $core-content-exercise

  .card-content-icon-background-video
    border-top-color: $core-content-video

  .card-content-icon-background-audio
    border-top-color: $core-content-audio

  .card-content-icon-background-document
    border-top-color: $core-content-document

  .card-content-icon-background-html5
    border-top-color: $core-content-html5

  .card-content-icon-wrapper
    position: absolute
    top: 0
    left: 0
    padding: 0.25em
    color: white

  .card-content-icon
    font-size: 1.25em

  .card-progress-bar-wrapper
    position: absolute
    bottom: 0
    background-color: $core-grey
    width: 100%
    height: 5px

  .card-progress-bar
    height: 100%

  .card-progress-bar-mastered
    background-color: $core-status-mastered

  .card-progress-bar-progress
    background-color: $core-status-progress

  .card-text
    padding: $card-text-padding
    height: $card-text-height
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
