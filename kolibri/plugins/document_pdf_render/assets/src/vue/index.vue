<template>

  <div>
    <div v-el:container class="container" allowfullscreen>
      <button class='btn' v-if="supportsPDFs" v-on:click="togglefullscreen">Toggle Fullscreen</button>
      <div v-el:pdfcontainer class="pdfcontainer"></div>

      <h2>Data:</h2>
      <p>Progress: {{ progress }} %</p>
      <p>Time Elapsed: {{ elapsedTime }}</p>
      <p>Total Time Spent: {{ totalTime }}</p>
      <p v-if="saving">Saving Progress...</p>
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
      handleScroll() {
        console.log('called');
      },
    },
    ready() {
      this.initContentSession();
      PDFobject.embed(this.defaultFile.storage_url, this.$els.pdfcontainer);
    },
    vuex: {
      actions: require('core-actions'),
      getters: {
        progress: (state) => state.pageState.logging.summary.progress,
        totalTime: (state) => state.pageState.logging.summary.total_time,
        elapsedTime: (state) => state.pageState.logging.interaction.total_time,
        saving: (state) => state.pageState.logging.interaction.pending_save,
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

</style>
