<template>

  <div
    class="scrolling-header"
    :class="classes"
  >
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
      // The scrollable height of the content area
      mainWrapperScrollHeight: {
        type: Number,
      },
      isHidden: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        scrollIntegral: 0,
      };
    },
    computed: {
      resetIntegralDebounced() {
        return debounce(this.resetIntegral, 500);
      },
      classes() {
        return {
          'is-hidden': this.isHidden,
          'dir-up': this.scrollIntegral > 0,
          'dir-down': this.scrollIntegral <= 0,
        };
      },
      scrollThreshold() {
        // Scroll thresholds are relative to how much you can scroll, since
        // users may also modulate their scrolling based on how much content they see.
        // To mitigate overscroll rebound and other reasons,
        // the upward threshold is set higher than the downward one.
        const downThresh = Math.round(this.mainWrapperScrollHeight * 0.05);
        return {
          up: downThresh * 2,
          down: downThresh,
        };
      },
      pastMinScroll() {
        return this.scrollPosition > TOP_THRESHOLD;
      },
    },
    watch: {
      scrollPosition(newVal, oldVal) {
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

        // Update scrollIntegral
        if (newVal === 0) {
          this.scrollIntegral = 0;
        } else if (this.scrollIntegral * delta < 0) {
          // Reset the integral if the direction changes
          this.scrollIntegral = delta;
        } else {
          this.scrollIntegral = this.scrollIntegral + delta;
        }

        // Update isHidden
        if (delta < 0) {
          // Un-hide if near top or up-delta is past threshold
          if (!this.pastMinScroll || -this.scrollIntegral > this.scrollThreshold.up) {
            this.$emit('update:isHidden', false);
          }
        } else if (delta > 0) {
          // Hide if past the top and down-delta is past threshold
          if (this.pastMinScroll && this.scrollIntegral > this.scrollThreshold.down) {
            this.$emit('update:isHidden', true);
          }
        }
        this.resetIntegralDebounced(delta, this.scrollPosition);
      },
      // Reset the scrolling integral if user pauses scrolling for some time.
      resetIntegral(delta, lastPos) {
        setTimeout(() => {
          if (this.scrollPosition === lastPos) {
            // Set to +/- 1 to maintain the direction
            this.scrollIntegral = Math.sign(delta);
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

    // Use different transition timing functions depending on direction
    // to maintain some kind of symmetry
    &.dir-up {
      transition: top 0.25s ease-in;
    }

    &.dir-down {
      transition: top 0.25s ease-out;
    }

    &.is-hidden {
      // 200px is arbitrary, so will not really work if app bar gets taller.
      // It's intentionally more than actual height so box shadows don't appear.
      top: -200px;
    }
  }

</style>
