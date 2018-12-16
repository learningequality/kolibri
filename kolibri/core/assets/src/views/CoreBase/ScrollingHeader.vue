<template>

  <div
    class="scrolling-header"
    :style="barPositioning"
    :class="{ 'ease': barPinned && transition }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import debounce from 'lodash/debounce';
  import logger from 'kolibri.lib.logging';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'ScrollingHeader',
    components: {},
    props: {
      // height of the bar being passed into the slot
      barHeight: {
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
      // print out the logic
      debug: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // whether app bar is moving with content or pinned to the page
        barPinned: true,
        // vertical offset of the app
        barTranslation: 0,
        // briefly enable CSS transitions when scrolling stops to prevent hard jumps
        transition: false,
      };
    },
    computed: {
      // sets up appropriate styles
      barPositioning() {
        return {
          position: this.barPinned ? 'fixed' : 'absolute',
          transform: `translateY(${this.barTranslation}px)`,
        };
      },
      // position of app bar relative to browser viewport
      barPos() {
        if (this.barPinned) {
          return this.barTranslation;
        }
        return this.barTranslation - this.scrollPosition;
      },
      // calls scrollingStopped 500ms after scrolling pauses
      waitForScrollStop() {
        return debounce(this.scrollingStopped, 250);
      },
    },
    watch: {
      scrollPosition(scrollPos, scrollPosPrev) {
        this.handleScroll(scrollPos, scrollPosPrev);
      },
    },
    methods: {
      log(msg) {
        if (this.debug) {
          logging.debug(msg);
        }
      },
      // based on the short history of scroll positions, figure out how to set positioning
      handleScroll(scrollPos, scrollPosPrev) {
        this.waitForScrollStop();
        this.transition = false;

        const delta = scrollPos - scrollPosPrev;

        // IF: scrolling upward, bar visibly pinned
        if (delta < 0 && this.barPinned && this.barTranslation === 0) {
          this.log('scrolling upward, bar visibly pinned');
          // THEN: bar stays visibly pinned
          return;
        }

        // IF: scrolling downward, bar visibly pinned
        else if (delta > 0 && this.barPinned && this.barTranslation === 0) {
          this.log('scrolling downward, bar visibly pinned');
          // THEN: attach at content position so it can scroll offscreen
          this.barPinned = false;
          this.barTranslation = scrollPos;
          return;
        }

        // IF: scrolling upward, bar invisibly pinned
        else if (delta < 0 && this.barPinned && this.barTranslation === -this.barHeight) {
          this.log('scrolling upward, bar invisibly pinned');
          // THEN: attach at content position
          this.barPinned = false;
          this.barTranslation = scrollPos - this.barHeight;
          return;
        }

        // IF: scrolling downward, bar invisibly pinned
        else if (delta > 0 && this.barPinned && this.barTranslation === -this.barHeight) {
          this.log('scrolling downward, bar invisibly pinned');
          // THEN: bar stays invisibly pinned
          return;
        }

        // IF: scrolling, bar pinned somewhere in the middle
        else if (this.barPinned) {
          this.log('scrolling, bar pinned somewhere unknown');
          // THEN: attach it to content at its current location
          this.barPinned = false;
          this.barTranslation = this.barTranslation + this.scrollPosition;
          return;
        }

        // IF: scrolling downward, attached to content
        else if (delta > 0 && !this.barPinned) {
          this.log('scrolling downward, attached to content');
          // IF: bar is fully offscreen
          if (this.barPos <= -this.barHeight) {
            this.log('  bar is fully offscreen');
            // THEN: pin bar offscreen
            this.barPinned = true;
            this.barTranslation = -this.barHeight;
            return;
          }
          // IF: bar is partially offscreen
          else if (-this.barHeight < this.barPos && this.barPos < 0) {
            this.log('  bar is partially offscreen');
            // THEN: stay attached to content at current position
            return;
          }
          // IF: if bar somehow got too low (barPos > 0)
          else {
            this.log('  if bar somehow got too low (barPos > 0)');
            // THEN: re-attach at content position
            this.barTranslation = scrollPos;
            return;
          }
        }

        // IF: scrolling upward, attached to content
        else if (delta < 0 && !this.barPinned) {
          this.log('scrolling upward, attached to content');
          // IF: bar is at least partially offscreen
          if (-this.barHeight <= this.barPos && this.barPos < 0) {
            this.log('  bar is at least partially offscreen');
            // IF: scrolling quickly relative to app bar height and distance remaining
            // note - both delta and barPos are negative here
            if (2 * delta < this.barPos) {
              this.log('  scrolling quickly relative to app bar height');
              // THEN: pin bar visibly
              this.barPinned = true;
              this.barTranslation = 0;
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
            this.barPinned = true;
            this.barTranslation = 0;
            return;
          }
          // IF: bar is too high (barPos < negBarHeight)
          else {
            this.log('  bar is too high (barPos < negBarHeight)');
            // THEN: re-attach at content position
            this.barPinned = false;
            this.barTranslation = scrollPos;
            return;
          }
        }

        // report if logic above is flawed or incomplete
        logging.warn(`Unhandled scrolling state:`);
        logging.warn(`\tAppbar height: ${this.barHeight}`);
        logging.warn(`\tAppbar translation: ${this.barTranslation}`);
        logging.warn(`\tIs pinned: ${this.barPinned}`);
      },
      // called when we've detected a pause in scrolling
      scrollingStopped() {
        this.log('scrolling stopped');

        // IF: the bar is already pinned
        if (this.barPinned) {
          this.log('  already pinned');
          // THEN: do nothing
          return;
        }

        // IF: the bar is attached to the content
        if (!this.barPinned) {
          this.log('  the bar is attached to the content');
          // IF: the content is near the top
          if (this.scrollPosition < this.barHeight) {
            this.log('    close to top');
            // THEN: pin bar visibly to prevent a blank space
            this.transitionTo(0);
            return;
          }
          // IF: bar is at least half visible
          else if (this.barPos > -this.barHeight / 2) {
            this.log('    at least half visible');
            // THEN: pin bar visibly
            this.transitionTo(0);
            return;
          }
          // IF: bar is less than half visible
          else {
            this.log('    less than half visible');
            // THEN: pin bar offscreen
            this.transitionTo(-this.barHeight);
            return;
          }
        }
      },
      //
      transitionTo(translation) {
        // first pin it at its current location
        this.barPinned = true;
        this.transition = false;
        this.barTranslation = this.barTranslation - this.scrollPosition;
        // Then on the next frame, transition it to be fully visible.
        // Expected $nextTick should have worked here, but it doesn't seem to.
        setTimeout(() => {
          this.transition = true;
          this.barTranslation = translation;
        }, 20);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .scrolling-header {
    @extend %enable-gpu-acceleration;

    right: 0;
    left: 0;
    z-index: 4;
  }

  .ease {
    transition-timing-function: ease-in;
    transition-duration: 0.1s;
    transition-property: transform;
  }

</style>
