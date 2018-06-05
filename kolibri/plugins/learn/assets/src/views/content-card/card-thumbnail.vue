<template>

  <div
    class="card-thumbnail-wrapper"
    :class="{ 'mobile-thumbnail' : isMobile }"
    :style="thumbnailBackground"
  >

    <content-icon
      v-if="!thumbnail"
      :kind="kind"
      class="type-icon"
    />

    <progress-icon
      v-if="progress > 0"
      class="progress-icon"
      :progress="progress"
    />

    <div
      v-if="showContentIcon"
      class="content-icon-wrapper"
    >
      <svg
        height="64"
        width="64"
        viewBox="0 0 64 64"
        class="content-icon-bg"
        :style="contentIconBgColor"
      >
        <polygon
          stroke-width="0"
          :points="contentIconBgCoords"
        />
      </svg>
      <content-icon
        :kind="kind"
        :showTooltip="true"
        class="content-icon"
      />
    </div>

    <div
      v-if="progress!==undefined"
      class="progress-bar-wrapper"
    >
      <div
        class="progress-bar"
        :style="{ width: `${progress * 100}%` }"
        :class="{ 'progress-bar-mastered': isMastered, 'progress-bar-progress': isInProgress }"
      >
      </div>
    </div>

  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import { validateContentNodeKind } from 'kolibri.utils.validators';

  export default {
    name: 'cardThumbnail',
    components: {
      contentIcon,
      progressIcon,
    },
    props: {
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      // If true, shows the content icon on the upper left of the thumbnail
      showContentIcon: {
        type: Boolean,
        default: true,
      },
      progress: {
        type: Number,
        required: false,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
      },
      isMobile: {
        type: Boolean,
        default: false,
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
      contentIconBgCoords() {
        const topLeft = '0,0';
        const topRight = '64,0';
        const bottomLeft = '0,64';
        const bottomRight = '64,64';
        if (this.isRtl) {
          return `${topLeft} ${topRight} ${bottomRight}`;
        }
        return `${topLeft} ${topRight} ${bottomLeft}`;
      },
      contentIconBgColor() {
        const kindToFillHex = {
          exercise: '#0eafaf',
          video: '#3938A5',
          audio: '#E65997',
          topic: '#262626',
          document: '#ED2828',
          html5: '#FF8B41',
        };
        return { fill: kindToFillHex[this.kind] };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './card.styl'

  .card-thumbnail-wrapper
    width: $thumb-width-desktop
    height: $thumb-height-desktop
    position: relative
    background-size: contain
    background-repeat: no-repeat
    background-position: center
    background-color: $core-bg-light

  .type-icon
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


  /* MOBILE OVERRIDES */
  .mobile-thumbnail.card-thumbnail-wrapper
    width: $thumb-width-mobile
    height: $thumb-height-mobile

  .mobile-thumbnail

    .type-icon
      transform: translate(-50%, -50%) scale(2)

    .content-icon-wrapper
      width: 48px
      height: 48px

    .content-icon
      font-size: 18px

</style>
