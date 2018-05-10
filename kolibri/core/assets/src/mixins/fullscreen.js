/*
  Apply this mixin to your vue components to add cross-browser fullscreen support.

  import fullscreen from 'kolibri.coreVue.mixins.fullscreen';

  export default {
    mixins: [fullscreen],
  }
*/

import ScreenFull from 'screenfull';
import { isAndroidWebView } from 'kolibri.utils.browser';

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
        element.classList.add('normalize-fullscreen');
      } else {
        element.classList.add('mimic-fullscreen');
      }
      this.isInFullscreen = true;
    },

    exitFullscreen(element) {
      if (this.fullscreenIsSupported) {
        ScreenFull.toggle(element);
        element.classList.remove('normalize-fullscreen');
      } else {
        element.classList.remove('mimic-fullscreen');
      }
      this.isInFullscreen = false;
    },
  },

  mounted() {
    this.fullscreenIsSupported = ScreenFull.enabled && !isAndroidWebView();
  },
};
