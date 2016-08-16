<template>

  <div>
    <div v-el:container class="container" allowfullscreen>
      <button class='btn' v-if="supportsPDFs" v-on:click="togglefullscreen">
        {{ inFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen') }}
      </button>
      <div v-el:pdfcontainer class="pdfcontainer"></div>
    </div>
  </div>

</template>


<script>

  const PDFobject = require('pdfobject');

  module.exports = {

    props: ['defaultFile'],

    data: () => ({
      supportsPDFs: PDFobject.supportsPDFs,
      timeout: null,
      inFullscreen: false,
    }),

    methods: {
      togglefullscreen() {
        const container = this.$els.container;
        if (!document.fullscreenElement
          && !document.webkitFullscreenElement
          && !document.mozFullScreenElement
          && !document.msFullscreenElement) {
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
          } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
          }
          this.inFullscreen = true;
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
          this.inFullscreen = false;
        }
      },
      updateFullscreenState() {
        if (!document.fullscreenElement
          && !document.webkitFullscreenElement
          && !document.mozFullScreenElement
          && !document.msFullscreenElement) {
          this.inFullscreen = false;
        }
      },
    },
    ready() {
      PDFobject.embed(this.defaultFile.storage_url, this.$els.pdfcontainer);
      this.$emit('startTracking');
      const self = this;
      this.timeout = setTimeout(() => {
        self.$emit('progressUpdate', 1);
      }, 15000);

      document.addEventListener('fullscreenchange', this.updateFullscreenState, false);
      document.addEventListener('webkitfullscreenchange', this.updateFullscreenState, false);
      document.addEventListener('mozfullscreenchange', this.updateFullscreenState, false);
      document.addEventListener('MSFullscreenChange', this.updateFullscreenState, false);
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');

      document.removeEventListener('fullscreenchange', this.updateFullscreenState, false);
      document.removeEventListener('webkitfullscreenchange', this.updateFullscreenState, false);
      document.removeEventListener('mozfullscreenchange', this.updateFullscreenState, false);
      document.removeEventListener('MSFullscreenChange', this.updateFullscreenState, false);
    },
    $trNameSpace: 'pdfRenderer',
    $trs: {
      exitFullscreen: 'Exit Fullscreen',
      enterFullscreen: 'Enter Fullscreen',
    },
  };

</script>


<style lang="stylus" scoped>

  .btn
    margin-bottom: 1em

  .container
    text-align: center
    height: 100%
    &:fullscreen
      width: 100%
      height: 100%

  .pdfcontainer
    /* Accounts for the button height. */
    height: calc(100% - 4em)

</style>
