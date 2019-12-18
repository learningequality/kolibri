<template>

  <div class="scrolling-header" :class="classes">
    <slot></slot>
  </div>

</template>


<script>

  import debounce from 'lodash/debounce';

  // Used to avoid large a gap between KPageContainer and top of view when hidden
  const TOP_THRESHOLD = 40;

  export default {
    name: 'ScrollingHeader',
    props: {
      // Current scroll offset of content pane
      scrollPosition: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0;
        },
      },
      // If 'true', keeps the header permanently pinned to the top
      alwaysVisible: {
        type: Boolean,
        default: false,
      },
      // The scrollable height of the content area
      mainWrapperScrollHeight: {
        type: Number,
      },
      // Synced with CoreBase to handle changes when window is resized
      isHidden: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        scrollDistance: 0,
      };
    },
    computed: {
      positiveScrollPosition() {
        // in case a negative number is passed in
        return Math.max(this.scrollPosition, 0);
      },
      resetDistanceDebounced() {
        return debounce(this.resetDistance, 500);
      },
      classes() {
        return {
          'is-hidden': this.isHidden,
          'dir-up': this.scrollDistance > 0,
          'dir-down': this.scrollDistance <= 0,
        };
      },
      scrollThreshold() {
        // Scroll thresholds are relative to how much you can scroll, since
        // users may also modulate their scrolling based on how much content they see.
        // Also, to mitigate overscroll rebound and other reasons,
        // the upward threshold is set higher than the downward one.
        // Capped at 240 px, which is half the height of a iPhone 4,
        // the page would need to be be at least 4800px high to reach this cap.
        const downThresh = Math.min(Math.round(this.mainWrapperScrollHeight * 0.05), 240);
        return {
          up: downThresh * 2,
          down: downThresh,
        };
      },
      pastMinScroll() {
        return this.positiveScrollPosition > TOP_THRESHOLD;
      },
    },
    watch: {
      positiveScrollPosition(newVal, oldVal) {
        if (!this.alwaysVisible) {
          this.handleNewScrollPosition(newVal, oldVal);
        }
      },
    },
    methods: {
      handleNewScrollPosition(newVal, oldVal) {
        const delta = newVal - oldVal;

        // If delta shouldn't cause a change in isHidden, then do nothing
        if ((this.isHidden && delta > 0) || (!this.isHidden && delta < 0)) {
          return;
        }

        // Update scrollDistance
        if (newVal === 0) {
          this.scrollDistance = 0;
        } else if (this.scrollDistance * delta < 0) {
          // Reset the distance if the direction changes
          this.scrollDistance = delta;
        } else {
          this.scrollDistance = this.scrollDistance + delta;
        }

        // If thresholds have been passed, then update isHidden
        if (delta < 0) {
          // Un-hide if near top or up-delta is past threshold
          if (!this.pastMinScroll || -this.scrollDistance > this.scrollThreshold.up) {
            this.$emit('update:isHidden', false);
          }
        } else if (delta > 0) {
          // Hide if past the top and down-delta is past threshold
          if (this.pastMinScroll && this.scrollDistance > this.scrollThreshold.down) {
            this.$emit('update:isHidden', true);
          }
        }

        this.resetDistanceDebounced(delta, this.positiveScrollPosition);
      },
      // Reset the scrolling distance if user pauses scrolling for some time.
      resetDistance(delta, lastPos) {
        setTimeout(() => {
          if (this.positiveScrollPosition === lastPos) {
            // Set to +/- 1 to maintain the direction
            this.scrollDistance = Math.sign(delta);
          }
        }, 2000);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .scrolling-header {
    @extend %enable-gpu-acceleration;

    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    z-index: 4;
    transition: transform 0.25s;

    // Use different transition timing functions depending on direction
    // to maintain some kind of symmetry. Curves are decelerate/accelerate
    // easing, respectively from https://material.io/design/motion/speed.html#easing.
    &.dir-up {
      @extend %md-decelerate-func;
    }

    &.dir-down {
      @extend %md-accelerate-func;
    }

    &.is-hidden {
      // 200px is arbitrary, so will not really work if app bar gets taller.
      // It's intentionally more than actual height so box shadows don't appear.
      transform: translateY(-200px);
    }
  }

</style>
