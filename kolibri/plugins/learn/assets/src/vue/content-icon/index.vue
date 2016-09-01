<template>

  <div>
    <svg v-if="thisIs('audio')" src="./content-icons/audio.svg" :class="{pageicon: ispageicon}" :title="altText"></svg>
    <svg v-if="thisIs('document')" src="./content-icons/document.svg" :class="{pageicon: ispageicon}" :title="altText"></svg>
    <svg v-if="thisIs('exercise')" src="./content-icons/exercise.svg" :class="{pageicon: ispageicon}" :title="altText"></svg>
    <svg v-if="thisIs('video')" src="./content-icons/video.svg" :class="{pageicon: ispageicon}" :title="altText"></svg>
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
      iconSrc() {
        return `./content-icons/unstarted-${this.kind}.svg`;
      },
      progressPercent() {
        return Math.floor(this.progress * 100);
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
    stroke-dasharray: 25 100 // 25 = 25 % full

</style>
