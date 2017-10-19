<template>

  <div class="card-thumbnail" :style="thumbnailBackground">

    <content-icon
      v-if="!thumbnail"
      :kind="kind"
      class="thumbnail-icon"
    />

    <progress-icon
      v-if="progress > 0"
      class="progress-icon"
      :progress="progress"
    />

    <div class="content-icon-wrapper">
      <svg
        height="64"
        width="64"
        viewBox="0 0 64 64"
        class="content-icon-bg"
        :style="contentIconBgColor"
      >
        <polygon stroke-width="0" points="0,0 60,0 0,60"/>
      </svg>
      <content-icon :kind="kind" class="content-icon"/>
    </div>

    <div class="progress-bar-wrapper">
      <div
        class="progress-bar"
        :style="{ width: `${progress * 100}%` }"
        :class="{ 'progress-bar-mastered': isMastered, 'progress-bar-progress': isInProgress }">
      </div>
    </div>

  </div>

</template>


<script>

  import values from 'lodash/values';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';

  export default {
    props: {
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
    },
    computed: {
      isMastered() {
        return this.progress === 1;
      },
      isInProgress() {
        return this.progress > 0 && this.progress < 1;
      },
      thumbnailBackground() {
        if (this.thumbnail) {
          return { backgroundImage: `url('${this.thumbnail}')` };
        }
        return {};
      },
      contentIconBgColor() {
        if (this.kind === 'exercise') {
          return { fill: '#0eafaf' };
        } else if (this.kind === 'video') {
          return { fill: '#3938A5' };
        } else if (this.kind === 'audio') {
          return { fill: '#E65997' };
        } else if (this.kind === 'document') {
          return { fill: '#ED2828' };
        } else if (this.kind === 'topic') {
          return { fill: '#262626' };
        } else if (this.kind === 'html5') {
          return { fill: '#FF8B41' };
        }
        return {};
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
  @require './card.styl'

  .card-thumbnail
    width: $thumb-width-desktop
    height: $thumb-height-desktop
    position: relative
    background-size: cover
    background-position: center
    background-color: $core-grey

  .thumbnail-icon
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%) scale(3)
    color: $core-text-annotation

  .progress-icon
    position: absolute
    top: 4px
    right: 4px

  .content-icon-wrapper
    position: absolute
    width: 56px
    height: 56px

  .content-icon
    position: absolute
    color: white
    transform: translate(25%, 0)
    font-size: 20px

  .content-icon-bg
    position: absolute
    width: 100%
    height: 100%
    fill-opacity: 0.9

  .progress-bar-wrapper
    position: absolute
    bottom: 0
    background-color: $core-grey
    width: 100%
    height: 5px
    opacity: 0.9

  .progress-bar
    height: 100%

  .progress-bar-mastered
    background-color: $core-status-mastered

  .progress-bar-progress
    background-color: $core-status-progress

</style>
