<template>

  <div
    ref="container"
    class="container"
    :class="!fullscreenAllowed && isFullScreen ? 'container-mimic-fullscreen' : ''"
    allowfullscreen>
    <icon-button
      class="btn"
      v-if="supportsPDFs"
      :text="isFullScreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullScreen"
      :primary="true">
      <mat-svg v-if="isFullScreen" class="icon" category="navigation" name="fullscreen_exit"/>
      <mat-svg v-else class="icon" category="navigation" name="fullscreen"/>
    </icon-button>
    <div ref="pdfcontainer" class="pdfcontainer"></div>
  </div>

</template>


<script>

  import PDFobject from 'pdfobject';
  import ScreenFull from 'screenfull';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    components: { iconButton },
    props: ['defaultFile'],
    data: () => ({
      supportsPDFs: PDFobject.supportsPDFs,
      timeout: null,
      isFullScreen: false,
    }),
    computed: {
      fullscreenAllowed() {
        return ScreenFull.enabled;
      },
    },
    methods: {
      toggleFullScreen() {
        if (this.isFullScreen) {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.container);
          }
          this.isFullScreen = false;
        } else {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.container);
          }
          this.isFullScreen = true;
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
    $trNameSpace: 'pdfRenderer',
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
    max-width: 100vw
    max-height: 100vh
    width: 100vw
    height: 100vh

  .pdfcontainer
    height: 100%

</style>
