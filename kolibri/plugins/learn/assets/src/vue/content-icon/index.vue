<template>

  <div>
    <svg
      :title="altText"
      height="32"
      width="32"
      viewbox="0 0 32 32">
      <circle
        style="fill:#d5d5d5"
        :style="{ 'stroke-dasharray': progressPercent + ' 100' }"
        class="outer-circle"
        cy="16"
        cx="16"
        r="16">
      </circle>
      <circle
        style="fill:#ffffff"
        class="inner-circle"
        cy="16"
        cx="16"
        r="13.5">
      </circle>
      <svg v-if="thisIs('audio')" src="./content-icons/audio.svg"></svg>
      <svg v-if="thisIs('document')" src="./content-icons/document.svg"></svg>
      <svg v-if="thisIs('exercise')" src="./content-icons/exercise.svg"></svg>
      <svg v-if="thisIs('video')" src="./content-icons/video.svg"></svg>
    </svg>
  </div>

</template>


<script>

  const KINDS = ['audio', 'document', 'video']; // not 'exercise' for now

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
          return KINDS.indexOf(value) !== -1;
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

  @require '~core-theme.styl'

  svg
    width: 100%
    height: 100%
    transform: rotate(-90deg)
    border-radius: 50%

  .outer-circle
    stroke: $core-action-normal
    stroke-width: 32
    stroke-dasharray: 0 100 // 0 = 0 % full

</style>
