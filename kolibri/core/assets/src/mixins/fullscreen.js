/*
  Apply this mixin to your vue components to add cross-browser fullscreen support.

  import fullscreen from 'kolibri.coreVue.mixins.fullscreen';

  export default {
    mixins: [fullscreen],
  }
*/

import ScreenFull from 'screenfull';
import { isAndroidWebView } from 'kolibri.utils.browser';

const NORMALIZE_FULLSCREEN_CLASS = 'normalize-fullscreen';
const MIMIC_FULLSCREEN_CLASS = 'mimic-fullscreen';

export default {
  data() {
    return {
      fullscreenIsSupported: false,
      isInFullscreen: false,
    };
  },

  methods: {
    toggleFullscreen(element) {
      if (this.isInFullscreen) {
        this.exitFullscreen(element);
      } else {
        this.enterFullScreen(element);
      }
    },

    enterFullScreen(element) {
      if (this.fullscreenIsSupported) {
        ScreenFull.toggle(element);
        element.classList.add(NORMALIZE_FULLSCREEN_CLASS);
      } else {
        element.classList.add(MIMIC_FULLSCREEN_CLASS);
      }
      this.isInFullscreen = true;
    },

    exitFullscreen(element) {
      if (this.fullscreenIsSupported) {
        ScreenFull.toggle(element);
        element.classList.remove(NORMALIZE_FULLSCREEN_CLASS);
      } else {
        element.classList.remove(MIMIC_FULLSCREEN_CLASS);
      }
      this.isInFullscreen = false;
    },
  },

  mounted() {
    this.fullscreenIsSupported = ScreenFull.enabled && !isAndroidWebView();

    // Catch the use of the esc key to exit fullscreen
    if (this.fullscreenIsSupported) {
      ScreenFull.onchange(() => {
        this.isInFullscreen = ScreenFull.isFullscreen;
        // Just exited fullscreen
        if (!this.isInFullscreen) {
          const elementWithClass = this.$el.querySelector(NORMALIZE_FULLSCREEN_CLASS);
          if (elementWithClass) {
            elementWithClass.classList.remove(NORMALIZE_FULLSCREEN_CLASS);
          }
        }
      });
    }
  },
};
