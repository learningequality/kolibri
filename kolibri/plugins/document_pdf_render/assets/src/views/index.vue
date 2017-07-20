<template>

  <div
    ref="container"
    class="container"
    :class="{ 'container-mimic-fullscreen': mimicFullscreen }">

    <icon-button
      v-if="supportsPDFs"
      class="btn"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullscreen"
      :primary="true">
      <mat-svg v-if="isFullscreen" class="icon" category="navigation" name="fullscreen_exit"/>
      <mat-svg v-else class="icon" category="navigation" name="fullscreen"/>
    </icon-button>

    <template v-else>
      <p role="alert">
        {{ $tr('pdfCompatibilityError') }}
      </p>
      <a :href="pdfURL">
        {{ $tr('pdfDownloadLink')}}
      </a>
    </template>

    <div ref="pdfcontainer" class="pdfcontainer"></div>

  </div>

</template>


<script>

  import PDFobject from 'pdfobject';
  import ScreenFull from 'screenfull';
  import iconButton from 'kolibri.coreVue.components.iconButton';

  const pdfObjectOptions = {
    fallbackLink: false,
  };

  export default {
    $trNameSpace: 'pdfDisplayPage',
    $trs: {
      pdfCompatibilityError: 'PDFs cannot be displayed inside Kolibri on your device',
      pdfDownloadLink: 'Click here download the PDF for viewing in a third-party application',
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
    name: 'pdfRender',
    components: { iconButton },
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
      pdfURL() {
        return this.defaultFile.storage_url;
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
      PDFobject.embed(this.pdfURL, this.$refs.pdfcontainer, pdfObjectOptions);
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
