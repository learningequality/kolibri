<template>

  <div
    ref="container"
    class="container"
    :class="{ 'container-mimic-fullscreen': mimicFullscreen }">
    <k-button
      class="btn"
      v-if="supportsPDFs"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullScreen"
      :primary="true"/>
    <div ref="pdfcontainer" class="pdfcontainer"></div>
  </div>

</template>


<script>

  import PDFobject from 'pdfobject';
  import ScreenFull from 'screenfull';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    components: { kButton },
    props: ['defaultFile'],
    data: () => ({
      supportsPDFs: PDFobject.supportsPDFs,
      timeout: null,
      isFullscreen: false,
    }),
    computed: {
      fullscreenAllowed() {
        return ScreenFull.enabled;
      },
      mimicFullscreen() {
        return !this.fullscreenAllowed && this.isFullscreen;
      },
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
    mounted() {
      PDFobject.embed(this.defaultFile.storage_url, this.$refs.pdfcontainer);
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
    name: 'pdfRenderer',
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
    height: 100vh
    max-height: calc(100vh - 24em)
    min-height: 400px
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

  .pdfcontainer
    height: 100%

</style>
