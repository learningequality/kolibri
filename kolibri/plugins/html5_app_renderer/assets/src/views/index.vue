<template>

  <div
    ref="html5Renderer"
    class="html5-renderer"
    :class="{ 'mimic-fullscreen': mimicFullscreen }"
    allowfullscreen
  >
    <k-button
      class="btn"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullscreen"
      :primary="true"
    />
    <iframe
      class="iframe"
      sandbox="allow-scripts"
      frameBorder="0"
      :src="rooturl"
    >
    </iframe>
  </div>

</template>


<script>

  import ScreenFull from 'screenfull';
  import kButton from 'kolibri.coreVue.components.kButton';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';

  export default {
    name: 'html5Renderer',
    components: { kButton },
    mixins: [contentRendererMixin],
    props: {
      defaultFile: {
        type: Object,
        required: true,
      },
    },
    data: () => ({ isFullscreen: false }),
    computed: {
      rooturl() {
        return this.defaultFile.storage_url;
      },
      fullscreenAllowed() {
        return ScreenFull.enabled;
      },
      mimicFullscreen() {
        return !this.fullscreenAllowed && this.isFullscreen;
      },
    },
    mounted() {
      this.$emit('startTracking');
      const self = this;
      this.timeout = setTimeout(() => {
        self.$emit('updateProgress', 1);
      }, 15000);
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');
    },
    methods: {
      toggleFullscreen() {
        if (this.isFullscreen) {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.html5Renderer);
          }
          this.isFullscreen = false;
        } else {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.html5Renderer);
          }
          this.isFullscreen = true;
        }
      },
    },
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
  };

</script>


<style lang="stylus" scoped>

  .btn
    position: absolute
    left: 50%
    transform: translateX(-50%)

  .html5-renderer
    position: relative
    text-align: center
    height: 500px
    overflow-x: auto
    &:fullscreen
      width: 100%
      height: 100%
      min-height: inherit
      max-height: inherit

  .mimic-fullscreen
    position: fixed
    top: 0
    right: 0
    bottom: 0
    left: 0
    z-index: 24
    max-width: 100%
    max-height: 100%
    width: 100%
    height: 100%

  .iframe
    height: 100%
    width: 100%

</style>
