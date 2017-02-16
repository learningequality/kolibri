
/*
  Apply this mixin to your vue components to get reactive information about window sizes.

  For example:

    <script>

      const responsiveWindow = require('./responsive-window-mixin.js')

      export default {
        mixins: [responsiveWindow],
        props: {
    ...

  This adds a new reactive property called `windowSize` to your vue model:

    windowSize: {
      width: 0,                   // window width (px)
      height: 0,                  // window height (px)
      breakpoint: 0,              // breakpoint constants
    }

  The breakpoint constants are numbers following Material guidelinse:
    https://material.io/guidelines/layout/responsive-ui.html#responsive-ui-breakpoints

  Breakpoint Breakdown:

    level 0
      < 480 px
      portrait handset, xsmall window
      4 columns, 16px gutter

    level 1
      < 600 px
      landscape or large portait handset, small portrait tablet, xsmall window,
      4 columns, 16px gutter

    level 2
      < 840 px
      large landscape handset, large portrait tablet, small window,
      8 columns, 16px gutter

    level 3
      < 960 px
      large landscape handset, large portrait tablet, small window,
      12 columns, 16px gutter

    level 4
      < 1280 px
      landscape tablet, small or medium window
      12 columns, 24px gutter

    level 5
      < 1440 px
      large landscape tablet, medium window
      12 columns, 24px gutter

    level 6
      < 1600 px
      large window
      12 columns, 24px gutter

    level 7
      >= 1600 px
      large or xlarge window
      12 columns, 24px gutter
*/


/* module internal state */

const windowListeners = [];


/* methods */

function getBreakpoint(width) {
  const SCROLL_BAR = 16;
  if (width < 480) { return 0; }
  if (width < 600) { return 1; }
  if (width < 840) { return 2; }
  if (width < 960 - SCROLL_BAR) { return 3; }
  if (width < 1280 - SCROLL_BAR) { return 4; }
  if (width < 1440 - SCROLL_BAR) { return 5; }
  if (width < 1600 - SCROLL_BAR) { return 6; }
  return 7;
}

function windowMetrics() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    breakpoint: getBreakpoint(window.innerWidth),
  };
}

const throttle = require('frame-throttle').throttle;
const windowResizeHandler = throttle((e) => {
  const metrics = windowMetrics();
  windowListeners.forEach(cb => cb(metrics));
});

function addWindowListener(cb) {
  windowListeners.push(cb);
  cb(windowMetrics()); // call it once initially
}

function removeWindowListener(cb) {
  windowListeners.pop(cb);
}


/* setup */

if (window.addEventListener) {
  window.addEventListener('resize', windowResizeHandler, true);
} else if (window.attachEvent) {
  window.attachEvent('onresize', windowResizeHandler);
}

windowResizeHandler(); // call it once initially


/* export mixin */

module.exports = {
  data() {
    return {
      // becomes available for use
      windowSize: { width: 0, height: 0, breakpoint: 0 },
    };
  },
  methods: {
    _updateWindow(metrics) {
      this.windowSize.width = metrics.width;
      this.windowSize.height = metrics.height;
      this.windowSize.breakpoint = metrics.breakpoint;
    },
  },
  mounted() {
    addWindowListener(this._updateWindow);
  },
  beforeDestroy() {
    removeWindowListener(this._updateWindow);
  },
};

