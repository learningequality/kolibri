/*
  Apply this mixin to your vue components to get reactive information about window sizes.

  For example:

    <script>

      import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

      export default {
        mixins: [responsiveWindow],
        props: {
    ...

  This adds a new reactive property called `windowSize` to your vue model:

    windowSize: {
      width: 0,                   // window width (px)
      height: 0,                  // window height (px)
      breakpoint: 0,              // breakpoint constants
      numCols: 0,                 // typical number of grid columns
      gutterWidth: 0,             // typical grid gutter (px)
      range: null,                // 'sm', 'md', or 'lg'
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

import { throttle } from 'frame-throttle';

/* module internal state */

const windowListeners = [];

/* methods */

function getBreakpoint() {
  const SCROLL_BAR = 16;
  const width = window.innerWidth;
  if (width < 480) {
    return 0;
  }
  if (width < 600) {
    return 1;
  }
  if (width < 840) {
    return 2;
  }
  if (width < 960 - SCROLL_BAR) {
    return 3;
  }
  if (width < 1280 - SCROLL_BAR) {
    return 4;
  }
  if (width < 1440 - SCROLL_BAR) {
    return 5;
  }
  if (width < 1600 - SCROLL_BAR) {
    return 6;
  }
  return 7;
}

function getNumCols(breakpoint) {
  if (breakpoint <= 1) {
    return 4;
  }
  if (breakpoint === 2) {
    return 8;
  }
  return 12;
}

function getGutterWidth(breakpoint) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (breakpoint <= 1) {
    return 16;
  }
  // 16px when the smallest width of the device is <600
  if (breakpoint <= 3 && Math.min(width, height) < 600) {
    return 16;
  }
  return 24;
}

function getRange(breakpoint) {
  if (breakpoint < 2) {
    return 'sm';
  }
  if (breakpoint < 5) {
    return 'md';
  }
  return 'lg';
}

function windowMetrics() {
  const breakpoint = getBreakpoint();
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    breakpoint,
    numCols: getNumCols(breakpoint),
    gutterWidth: getGutterWidth(breakpoint),
    range: getRange(breakpoint),
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
      // becomes available for use
      windowSize: {
        width: 0,
        height: 0,
        breakpoint: 0,
        numCols: 0,
        gutterWidth: 0,
        range: null,
      },
    };
  },
  methods: {
    _updateWindow(metrics) {
      this.windowSize.width = metrics.width;
      this.windowSize.height = metrics.height;
      this.windowSize.breakpoint = metrics.breakpoint;
      this.windowSize.numCols = metrics.numCols;
      this.windowSize.gutterWidth = metrics.gutterWidth;
      this.windowSize.range = metrics.range;
    },
  },
  mounted() {
    addWindowListener(this._updateWindow);
  },
  beforeDestroy() {
    removeWindowListener(this._updateWindow);
  },
};
