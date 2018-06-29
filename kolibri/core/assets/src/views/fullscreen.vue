<template>

  <div
    ref="fullscreen"
    :class="fullscreenClass"
    allowfullscreen
  >
    <slot></slot>
  </div>

</template>


<script>

  import ScreenFull from 'screenfull';
  import { fullscreenApiIsSupported } from 'kolibri.utils.browser';

  const NORMALIZE_FULLSCREEN_CLASS = 'normalize-fullscreen';
  const MIMIC_FULLSCREEN_CLASS = 'mimic-fullscreen';

  export default {
    name: 'fullscreen',
    data() {
      return {
        isInFullscreen: false,
      };
    },
    computed: {
      fullscreenClass() {
        if (this.isInFullscreen) {
          return fullscreenApiIsSupported ? NORMALIZE_FULLSCREEN_CLASS : MIMIC_FULLSCREEN_CLASS;
        }
        return null;
      },
    },
    watch: {
      isInFullscreen(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.$emit('changeFullscreen', newVal);
        }
      },
    },
    mounted() {
      // Catch the use of the esc key to exit fullscreen
      if (fullscreenApiIsSupported) {
        ScreenFull.onchange(() => {
          this.isInFullscreen = ScreenFull.isFullscreen;
        });
      }
    },
    methods: {
      enterFullScreen() {
        if (fullscreenApiIsSupported) {
          ScreenFull.toggle(this.$refs.fullscreen);
        }
        this.isInFullscreen = true;
      },
      exitFullscreen() {
        if (fullscreenApiIsSupported) {
          ScreenFull.toggle(this.$refs.fullscreen);
        }
        this.isInFullscreen = false;
      },
      toggleFullscreen() {
        this.isInFullscreen ? this.exitFullscreen() : this.enterFullScreen();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  // @stylint off

  .normalize-fullscreen
    width: 100% !important
    height: 100% !important
    min-height: inherit !important
    max-height: inherit !important

  .mimic-fullscreen
    position: fixed !important
    top: 0 !important
    right: 0 !important
    bottom: 0 !important
    left: 0 !important
    z-index: 24 !important
    max-width: 100% !important
    max-height: 100% !important
    width: 100% !important
    height: 100% !important
    background-color: black !important
    // @stylint on

</style>
