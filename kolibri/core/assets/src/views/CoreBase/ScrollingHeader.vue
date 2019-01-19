<template>

  <div
    class="scrolling-header"
    :style="barPositioning"
    :class="{ 'ease': pinned && transition }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import debounce from 'lodash/debounce';
  import logger from 'kolibri.lib.logging';

  const logging = logger.getLogger(__filename);

  /*
    The parameters below can be fine-tuned:
  */
  // time waited to see if scrolling has stopped
  const SCROLL_STOPPED_WAIT = 250;
  // time waited between flipping position styles and enabling CSS transition
  const TRANSITION_START_DELAY = 25;
  // Fraction of app bar height that triggers hiding a partially-visible bar.
  // For example, 4 would mean the bar gets hidden if at least 1/4 of the height is offscreen
  const THRESHOLD_DIVISOR = 3;
  // Determines how aggressively we extrapolate scroll position and preemptively pin the bar.
  // For example, if you scroll up very quickly, the bar might appear in the middle of the screen.
  const SPEED_SCALER = 2;

  export default {
    name: 'ScrollingHeader',
    components: {},
    props: {
      // height of the bar being passed into the slot
      height: {
        type: Number,
        required: true,
        validator(value) {
          return value > 0;
        },
      },
      // current scroll offset of content pane
      scrollPosition: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0;
        },
      },
      // keep the header permanently pinned to the top
      alwaysVisible: {
        type: Boolean,
        default: false,
      },
      // print out the logic
      debug: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // whether app bar is moving with content or pinned to the page
        pinned: true,
        // vertical offset of the bar. generally in range [-height, 0] inclusive
        offset: 0,
        // briefly enable CSS transitions when scrolling stops to prevent hard jumps
        transition: false,
      };
    },
    computed: {
      // sets up appropriate styles
      barPositioning() {
        if (this.alwaysVisible) {
          return { position: 'fixed' };
        }
        return {
          position: this.pinned ? 'fixed' : 'absolute',
          transform: `translateY(${this.offset}px)`,
        };
      },
      // position of app bar relative to browser viewport
      barPos() {
        if (this.pinned) {
          return this.offset;
        }
        return this.offset - this.scrollPosition;
      },
      // calls scrollingStopped a short period after scrolling pauses
      waitForScrollStop() {
        return debounce(this.scrollingStopped, SCROLL_STOPPED_WAIT);
      },
    },
    watch: {
      scrollPosition(scrollPosNew, scrollPosPrev) {
        if (!this.alwaysVisible) {
          this.handleScroll(scrollPosNew - scrollPosPrev);
        }
      },
    },
    methods: {
      log(msg) {
        if (this.debug) {
          logging.debug(msg);
        }
      },
      // based on the short history of scroll positions, figure out how to set positioning
      handleScroll(delta) {
        this.waitForScrollStop();
        this.transition = false;

        // IF: scrolling upward, bar visibly pinned
        if (delta < 0 && this.pinned && this.offset === 0) {
          this.log('scrolling upward, bar visibly pinned');
          // THEN: bar stays visibly pinned
          return;
        }

        // IF: scrolling downward, bar visibly pinned
        else if (delta > 0 && this.pinned && this.offset === 0) {
          this.log('scrolling downward, bar visibly pinned');
          // THEN: attach at content position so it can scroll offscreen
          this.pinned = false;
          this.offset = this.scrollPosition;
          return;
        }

        // IF: scrolling upward, bar invisibly pinned
        else if (delta < 0 && this.pinned && this.offset === -this.height) {
          this.log('scrolling upward, bar invisibly pinned');
          // THEN: attach at content position
          this.pinned = false;
          this.offset = this.scrollPosition - this.height;
          return;
        }

        // IF: scrolling downward, bar invisibly pinned
        else if (delta > 0 && this.pinned && this.offset === -this.height) {
          this.log('scrolling downward, bar invisibly pinned');
          // THEN: bar stays invisibly pinned
          return;
        }

        // IF: scrolling, bar pinned somewhere in the middle
        else if (this.pinned) {
          this.log('scrolling, bar pinned somewhere unknown');
          // THEN: attach it to content at its current location
          this.pinned = false;
          this.offset = this.offset + this.scrollPosition;
          return;
        }

        // IF: scrolling downward, attached to content
        else if (delta > 0 && !this.pinned) {
          this.log('scrolling downward, attached to content');
          // IF: bar is fully offscreen
          if (this.barPos <= -this.height) {
            this.log('  bar is fully offscreen');
            // THEN: pin bar offscreen
            this.pinned = true;
            this.offset = -this.height;
            return;
          }
          // IF: bar is partially offscreen
          else if (-this.height < this.barPos && this.barPos < 0) {
            this.log('  bar is partially offscreen');
            // THEN: stay attached to content at current position
            return;
          }
          // IF: if bar somehow got too low (barPos > 0)
          else {
            this.log('  if bar somehow got too low (barPos > 0)');
            // THEN: re-attach at content position
            this.offset = this.scrollPosition;
            return;
          }
        }

        // IF: scrolling upward, attached to content
        else if (delta < 0 && !this.pinned) {
          this.log('scrolling upward, attached to content');
          // IF: bar is at least partially offscreen
          if (-this.height <= this.barPos && this.barPos < 0) {
            this.log('  bar is at least partially offscreen');
            // IF: scrolling quickly relative to app bar height and distance remaining
            // note - both delta and barPos are negative here
            if (SPEED_SCALER * delta < this.barPos) {
              this.log('  scrolling quickly relative to app bar height');
              // THEN: pin bar visibly
              this.pinned = true;
              this.offset = 0;
              return;
            } else {
              this.log('  scrolling slowly relative to app bar height');
              // THEN: stay attached to content at bar position
              return;
            }
          }
          // IF: bar is too low, e.g. due to momentum or overshoot
          else if (this.barPos >= 0) {
            this.log('  bar is too low, e.g. due to momentum or overshoot');
            // THEN: pin bar visibly
            this.pinned = true;
            this.offset = 0;
            return;
          }
          // IF: bar is too high (barPos < negBarHeight)
          else {
            this.log('  bar is too high (barPos < negBarHeight)');
            // THEN: re-attach at content position
            this.pinned = false;
            this.offset = this.scrollPosition;
            return;
          }
        }

        // report if logic above is flawed or incomplete
        logging.warn(`Unhandled scrolling state:`);
        logging.warn(`\tAppbar height: ${this.height}`);
        logging.warn(`\tAppbar offset: ${this.offset}`);
        logging.warn(`\tIs pinned: ${this.pinned}`);
      },
      // called when we've detected a pause in scrolling
      scrollingStopped() {
        this.log('scrolling stopped');

        // IF: the bar is already pinned
        if (this.pinned) {
          this.log('  already pinned');
          // THEN: do nothing
          return;
        }

        // IF: the bar is attached to the content
        if (!this.pinned) {
          this.log('  the bar is attached to the content');
          // IF: the content is near the top
          if (this.scrollPosition < this.height) {
            this.log('    close to top');
            // THEN: pin bar visibly to prevent a blank space
            this.transitionTo(0);
            return;
          }
          // IF: bar is at least two thirds visible
          else if (-this.barPos < this.height / THRESHOLD_DIVISOR) {
            this.log('    at least two thirds visible');
            // THEN: pin bar visibly
            this.transitionTo(0);
            return;
          }
          // IF: bar is up to two thirds visible
          else {
            this.log('    up to two thirds visible');
            // THEN: pin bar offscreen
            this.transitionTo(-this.height);
            return;
          }
        }
      },
      // In order to make the transition work right, we need to switch to position: fixed first
      transitionTo(offset) {
        // first pin it at its current location
        this.pinned = true;
        this.transition = false;
        this.offset = this.offset - this.scrollPosition;
        // Then on the next frame, transition it to be fully visible.
        // Expected $nextTick should have worked here, but it doesn't seem to.
        setTimeout(() => {
          this.transition = true;
          this.offset = offset;
        }, TRANSITION_START_DELAY);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .scrolling-header {
    top: 0;
    right: 0;
    left: 0;
    z-index: 4;
  }

  .ease {
    transition-timing-function: ease-in;
    transition-duration: 0.1s;
    transition-property: transform;
  }

  // Makes the KModal take up the entire vertical height of the window
  /deep/ .modal-overlay {
    height: 100vh;
  }

</style>
