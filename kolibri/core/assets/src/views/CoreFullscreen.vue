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
    name: 'CoreFullscreen',
    data() {
      return {
        isInFullscreen: false,
        toggling: false,
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
      /**
       * @public
       */
      toggleFullscreen() {
        if (!this.toggling) {
          let fullScreenPromise;
          this.toggling = true;
          if (fullscreenApiIsSupported) {
            fullScreenPromise = ScreenFull.toggle(this.$refs.fullscreen);
          } else {
            fullScreenPromise = Promise.resolve();
          }
          fullScreenPromise.then(() => {
            this.isInFullscreen = fullscreenApiIsSupported
              ? ScreenFull.isFullscreen
              : !this.isInFullscreen;
            this.toggling = false;
          });
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .normalize-fullscreen {
    width: 100% !important;
    height: 100% !important;
    min-height: inherit !important;
    max-height: inherit !important;
  }

  .mimic-fullscreen {
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    z-index: 24 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    background-color: black !important;
  }

</style>
