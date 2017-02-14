<template>

  <div ref="container" class="container" allowfullscreen>
    <icon-button
      class="btn"
      :text="isFullScreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullScreen"
      :primary="true">
      <mat-svg v-if="isFullScreen" class="icon" category="navigation" name="fullscreen_exit"/>
      <mat-svg v-else class="icon" category="navigation" name="fullscreen"/>
    </icon-button>
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
    position: absolute
    left: 50%
    transform: translateX(-50%)

  .container
    position: relative
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
    height: 100%
    width: 100%

</style>
