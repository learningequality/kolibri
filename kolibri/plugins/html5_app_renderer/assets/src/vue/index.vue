<template>

  <div v-el:container class="container" allowfullscreen>
    <icon-button
      class="btn"
      :text="inFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="togglefullscreen">
    </icon-button>
    <iframe v-el:sandbox class="sandbox" :src="rooturl" sandbox="allow-scripts"></iframe>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: ['defaultFile'],
    data: () => ({
      inFullscreen: false,
    }),
    computed: {
      rooturl() {
        return this.defaultFile.storage_url;
      },
    },
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
    $trNameSpace: 'html5Renderer',
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

  .sandbox
    /* Accounts for the button height. */
    height: calc(100% - 4em)
    width: 100%

</style>
