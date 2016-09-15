<template>

  <div class="svg-wrapper">
    <svg
      viewbox="0 0 32 32"
      class="content-icon"
      :title="altText">
      <circle
        cy="16"
        cx="16"
        r="16"
        class="progress-circle"
        :style="{ 'stroke-dasharray': progressPercent + ' 100' }">
      </circle>
      <circle
        cy="16"
        cx="16"
        r="13.5"
        class="inner-circle">
      </circle>
      <svg v-if="thisIs('audio')" src="./content-icons/audio.svg" class="content-type-icon"></svg>
      <svg v-if="thisIs('document')" src="./content-icons/document.svg" class="content-type-icon"></svg>
      <svg v-if="thisIs('exercise')" src="./content-icons/exercise.svg" class="content-type-icon"></svg>
      <svg v-if="thisIs('video')" src="./content-icons/video.svg" class="content-type-icon"></svg>
    </svg>
  </div>

</template>


<script>

  const ContentKinds = require('kolibri/coreVue/vuex/constants').ContentKinds;

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      complete: 'complete',
      partial: 'partial',
      unstarted: 'unstarted',
      audio: 'audio',
      document: 'document',
      video: 'video',
    },
    props: {
      ispageicon: {
        type: Boolean,
        default: false,
      },
      size: {
        type: Number,
        default: 30,
      },
      progress: {
        type: Number,
        default: 0.0,
        validator(value) {
          return (value >= 0.0) && (value <= 1.0);
        },
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          for (const contentKind in ContentKinds) {
            if (ContentKinds[contentKind] === value) {
              return true;
            }
          }
          return false;
        },
      },
    },
    computed: {
      altText() {
        return `${this.progress} - ${this.$tr(this.kind)}`;
      },
      progressPercent() {
        let progressPercent = Math.floor(this.progress * 100);
        // Due to rounding error
        if (progressPercent === 100) {
          progressPercent = 101;
        }
        return progressPercent;
      },
    },
    methods: {
      thisIs(kind) {
        return this.kind === kind;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  .svg-wrapper
    width: 100%
    height: 100%

  .content-icon
    width: 100%
    height: 100%
    transform: rotate(-90deg)
    border-radius: 50%

  .progress-circle
    fill: #d5d5d5
    stroke: $core-action-normal
    stroke-width: 32
    stroke-dasharray: 0 100 // 0 = 0 % full

  .inner-circle
    fill: white

  .content-type-icon
    fill: $core-action-normal

</style>
