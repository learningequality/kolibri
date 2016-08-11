<template>

  <div>
    <h3 class="progress-percent">
      <i class="progress-saving" v-if="saving">Saving Progress...&nbsp;</i>
      {{ Math.floor(progress * 100) }}%
    </h3>
    <div v-el:container class="container" allowfullscreen>
      <button class='btn' v-if="supportsPDFs" v-on:click="togglefullscreen">Toggle Fullscreen</button>
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
        }
      },
    },
    ready() {
      this.initContentSession();
      PDFobject.embed(this.defaultFile.storage_url, this.$els.pdfcontainer);
      this.startTrackingProgress();
      const self = this;
      setTimeout(() => {
        self.updateProgress(1);
      }, 15000);
    },
    beforeDestroy() {
      this.stopTrackingProgress();
    },
    vuex: {
      actions: require('learn-actions'),
      getters: {
        progress: (state) => state.pageState.logging.summary.progress,
        // totalTime: (state) => state.pageState.logging.summary.total_time,
        // elapsedTime: (state) => state.pageState.logging.interaction.total_time,
        saving: (state) => state.pageState.logging.summary.pending_save,
      },
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

  .progress-percent
    text-align:right
    .progress-saving
      font-size:10pt

</style>
