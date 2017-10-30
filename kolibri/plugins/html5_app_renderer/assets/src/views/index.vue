<template>

  <div
    ref="container"
    class="container"
    :class="{ 'container-mimic-fullscreen': mimicFullscreen }"
    allowfullscreen>
    <k-button
      class="btn"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullscreen"
      :primary="true" />
    <iframe ref="sandbox" class="sandbox" :src="rooturl" sandbox="allow-scripts"></iframe>
  </div>

</template>


<script>

  import ScreenFull from 'screenfull';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'html5Renderer',
    components: { kButton },
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
            ScreenFull.toggle(this.$refs.container);
          }
          this.isFullscreen = false;
        } else {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.container);
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

  .container
    position: relative
    text-align: center
    height: 100vh
    max-height: calc(100vh - 24em)
    min-height: 400px
    overflow-x: auto
    &:fullscreen
      width: 100%
      height: 100%
      min-height: inherit
      max-height: inherit

  .container-mimic-fullscreen
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

  .sandbox
    height: 100%
    width: 100%

</style>
