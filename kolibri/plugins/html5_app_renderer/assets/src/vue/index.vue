<template>

  <div ref="container" class="container" allowfullscreen>
    <icon-button
      class="btn"
      :text="isFullScreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullScreen"/>
    <iframe ref="sandbox" class="sandbox" :src="rooturl" sandbox="allow-scripts"></iframe>
  </div>

</template>


<script>

  const ScreenFull = require('screenfull');

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      defaultFile: {
        type: Object,
        required: true,
      },
    },
    data: () => ({
      isFullScreen: false,
    }),
    computed: {
      rooturl() {
        return this.defaultFile.storage_url;
      },
    },
    methods: {
      toggleFullScreen() {
        ScreenFull.toggle(this.$refs.container);
        this.isFullScreen = ScreenFull.isFullscreen;
      },
    },
    ready() {
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
