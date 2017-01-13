<template>

  <div ref="container" class="container" allowfullscreen>
    <icon-button
      class="btn"
      v-if="supportsPDFs"
      :text="isFullScreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullScreen"/>
    <div ref="pdfcontainer" class="pdfcontainer"></div>
  </div>

</template>


<script>

  const PDFobject = require('pdfobject');
  const ScreenFull = require('screenfull');

  module.exports = {

    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },

    props: ['defaultFile'],

    data: () => ({
      supportsPDFs: PDFobject.supportsPDFs,
      timeout: null,
      isFullScreen: false,
    }),

    methods: {
      toggleFullScreen() {
        ScreenFull.toggle(this.$refs.container);
        this.isFullScreen = ScreenFull.isFullscreen;
      },
    },
    mounted() {
      PDFobject.embed(this.defaultFile.storage_url, this.$refs.pdfcontainer);
      this.$emit('startTracking');
      const self = this;
      this.timeout = setTimeout(() => {
        self.$emit('progressUpdate', 1);
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
    height: 100vh
    max-height: calc(100vh - 24em)
    min-height: 400px
    &:fullscreen
      width: 100%
      height: 100%
      min-height: inherit
      max-height: inherit

  .pdfcontainer
    /* Accounts for the button height. */
    height: calc(100% - 4em)

</style>
