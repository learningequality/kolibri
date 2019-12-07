/*
  Apply this mixin to your vue components to get reactive information about window sizes.

  Adds a few new reactive properties to your vue model:

    this.windowHeight       // height in pixels
    this.windowWidth        // width in pixels
    this.windowBreakpoint   // breakpoint level as described below
    this.windowIsSmall      // boolean for small range (level < 2)
    this.windowIsMedium     // boolean for medium range (level = 2)
    this.windowIsLarge      // boolean for large range (level > 2)

  The breakpoint levels are numbers following Material guidelinse:
    https://material.io/guidelines/layout/responsive-ui.html#responsive-ui-breakpoints

  Breakpoint Breakdown:

    level 0 (small)
      < 480 px
      portrait handset, xsmall window
      4 columns, 16px gutter

    level 1 (small)
      < 600 px
      landscape or large portait handset, small portrait tablet, xsmall window,
      4 columns, 16px gutter

    level 2 (medium)
      < 840 px
      large landscape handset, large portrait tablet, small window,
      8 columns, 16px gutter

    level 3 (large)
      < 960 px
      large landscape handset, large portrait tablet, small window,
      12 columns, 16px gutter

    level 4 (large)
      < 1280 px
      landscape tablet, small or medium window
      12 columns, 24px gutter

    level 5 (large)
      < 1440 px
      large landscape tablet, medium window
      12 columns, 24px gutter

    level 6 (large)
      < 1600 px
      large window
      12 columns, 24px gutter

    level 7 (large)
      >= 1600 px
      large or xlarge window
      12 columns, 24px gutter
*/

import { throttle } from 'frame-throttle';

/* module internal state */

const windowListeners = [];

/* methods */

function windowMetrics() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

const windowResizeHandler = throttle(() => {
  const metrics = windowMetrics();
  windowListeners.forEach(cb => cb(metrics));
});

function addWindowListener(cb) {
  windowListeners.push(cb);
  cb(windowMetrics()); // call it once initially
}

function removeWindowListener(cb) {
  windowListeners.splice(windowListeners.indexOf(cb), 1);
}

/* setup */

if (window.addEventListener) {
  window.addEventListener('resize', windowResizeHandler, true);
} else if (window.attachEvent) {
  window.attachEvent('onresize', windowResizeHandler);
}

windowResizeHandler(); // call it once initially

/* export mixin */

export default {
  data() {
    return {
      windowWidth: undefined,
      windowHeight: undefined,

      /*
        Implementing breakpoint as data controlled by watchers to work around
        optimization issue: https://github.com/vuejs/vue/issues/10344
        If that issue ever gets addressed, we should make them computed props.
      */
      windowBreakpoint: undefined,
      windowIsPortrait: false,
      windowIsLandscape: false,
      windowGutter: 16,
      windowIsShort: false,
    };
  },
  watch: {
    windowWidth() {
      this._updateBreakpoint();
      this._updateGutter();
      this._updateOrientation();
    },
    windowHeight() {
      this.windowIsShort = this.windowHeight < 600;
      this._updateGutter();
      this._updateOrientation();
    },
  },
  computed: {
    /*
      CAUTION: do not reference windowWidth or windowHeight in computed props.
    */
    windowIsLarge() {
      return this.windowBreakpoint > 2;
    },
    windowIsMedium() {
      return this.windowBreakpoint === 2;
    },
    windowIsSmall() {
      return this.windowBreakpoint < 2;
    },
  },
  methods: {
    _updateWindow(metrics) {
      this.windowWidth = metrics.width;
      this.windowHeight = metrics.height;
    },
    _updateBreakpoint() {
      const SCROLL_BAR = 16;
      if (this.windowWidth < 480) {
        this.windowBreakpoint = 0;
      } else if (this.windowWidth < 600) {
        this.windowBreakpoint = 1;
      } else if (this.windowWidth < 840) {
        this.windowBreakpoint = 2;
      } else if (this.windowWidth < 960 - SCROLL_BAR) {
        this.windowBreakpoint = 3;
      } else if (this.windowWidth < 1280 - SCROLL_BAR) {
        this.windowBreakpoint = 4;
      } else if (this.windowWidth < 1440 - SCROLL_BAR) {
        this.windowBreakpoint = 5;
      } else if (this.windowWidth < 1600 - SCROLL_BAR) {
        this.windowBreakpoint = 6;
      } else {
        this.windowBreakpoint = 7;
      }
    },
    _updateOrientation() {
      this.windowIsPortrait = this.windowWidth < this.windowHeight;
      this.windowIsLandscape = !this.windowIsPortrait;
    },
    _updateGutter() {
      if (this.windowIsSmall) {
        this.windowGutter = 16;
      } else if (this.windowBreakpoint < 4 && Math.min(this.windowWidth, this.windowHeight) < 600) {
        // 16px when the smallest dimension of the window is < 600
        this.windowGutter = 16;
      } else {
        this.windowGutter = 24;
      }
    },
  },
  mounted() {
    addWindowListener(this._updateWindow);
  },
  beforeDestroy() {
    removeWindowListener(this._updateWindow);
  },
};
