<template>

  <!--
  This component was forked from the Keen library in order to handle
  dynamic styling of the loader background color.

  Logic and styling has been consolidated with the KLinearLoader to simplify
  and remove unused logic.
  -->
  <transition name="ui-progress-linear--transition-fade">
    <div
      class="ui-progress-linear"
      :class="classes"
      :style="{ backgroundColor: `rgba(${$themeTokens.loading}, 0.4)` }"
    >
      <div
        v-if="type === 'determinate'"
        class="ui-progress-linear-progress-bar is-determinate"

        role="progressbar"
        :aria-valuemax="100"
        :aria-valuemin="0"
        :aria-valuenow="moderatedProgress"

        :style="{
          transform: `scaleX(${moderatedProgress / 100})`,
          backgroundColor: $themeTokens.loading,
        }"
      ></div>

      <div
        v-else
        class="ui-progress-linear-progress-bar is-indeterminate"

        role="progressbar"
        :aria-valuemax="100"
        :aria-valuemin="0"

        :style="{ backgroundColor: $themeTokens.loading }"
      ></div>
    </div>
  </transition>

</template>


<script>

  /**
   * Used to show determinate or indeterminate loading
   */
  export default {
    name: 'KLinearLoader',
    props: {
      /**
       * Whether there should be a delay before the loader displays
       */
      delay: {
        type: Boolean,
        required: true,
      },
      /**
       * Determinate or indeterminate
       */
      type: {
        type: String,
        default: 'indeterminate',
        validator(val) {
          return val === 'determinate' || val === 'indeterminate';
        },
      },
      progress: {
        type: Number,
        default: 0,
      },
    },

    computed: {
      classes() {
        return [`ui-progress-linear--type-${this.type}`, this.delay ? 'delay' : ''];
      },

      moderatedProgress() {
        if (this.progress < 0) {
          return 0;
        }

        if (this.progress > 100) {
          return 100;
        }

        return this.progress;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~keen-ui/src/styles/imports';
  @import '~kolibri.styles.definitions';

  .delay {
    animation-delay: 1s;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  $ui-progress-linear-height: rem-calc(4px) !default;

  .ui-progress-linear {
    position: relative;
    display: block;
    width: 100%;
    height: $ui-progress-linear-height;
    overflow: hidden;
    border-radius: 2px;
    transition-timing-function: ease;
    transition-duration: 0.3s;
    transition-property: height, opacity;
    animation: fadeIn;
    animation-duration: 0s;
    animation-fill-mode: backwards;
  }

  .ui-progress-linear-progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: $ui-progress-linear-height;
    transform-origin: left;

    &.is-determinate {
      transition: transform 0.2s ease;
    }

    &.is-indeterminate {
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(0) scaleX(0);
      animation: ui-progress-linear-indeterminate 2.1s linear infinite;
    }
  }

  // ================================================
  // Animations
  // ================================================

  @keyframes ui-progress-linear-indeterminate {
    // First half: short in, long out
    0% {
      transform: translateX(0) scaleX(0);
    }

    25% {
      transform: translateX(50%) scaleX(0.6);
    }

    49% {
      transform: translateX(110%) scaleX(0);
    }

    // Second half: long in, short out
    50% {
      transform: translateX(0) scaleX(0);
    }

    75% {
      transform: translateX(0) scaleX(0.6);
    }

    100% {
      transform: translateX(110%) scaleX(0);
    }
  }

  // ================================================
  // Toggle transition
  // ================================================

  .ui-progress-linear--transition-fade-enter-active,
  .ui-progress-linear--transition-fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .ui-progress-linear--transition-fade-enter,
  .ui-progress-linear--transition-fade-leave-active {
    opacity: 0;
  }

</style>
