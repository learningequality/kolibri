<template>

  <div class="wrapper">
    <div
      class="answer"
      v-for="(item, index) in log"
      transition="fade"
      :style="styleForIndex(index)"
    >
      <answer-icon :answer="item" :success="success"/>
    </div>
    <div
      class="placeholder"
      v-for="i in numSpaces"
      :class="{'placeholder-empty': i === 0 && waiting}"
    ></div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      // Creates an empty space awaiting a new attempt
      waiting: {
        type: Boolean,
        required: true,
      },
      // Visually indicate that the user has succeeded
      success: {
        type: Boolean,
        required: true,
      },
      // Total number of answer spaces to show
      numSpaces: {
        type: Number,
        required: true,
      },
      // An array of AnswerTypes for all attempts (including those not shown).
      // Ordered from first to most recent.
      log: {
        type: Array,
      },
    },
    components: {
      'answer-icon': require('./answer-icon'),
    },
    computed: {
      numItemsToRender() {
        if (this.waiting) {
          return this.numSpaces;
        }
        return this.numSpaces + 1;
      },
    },
    methods: {
      styleForIndex(visualIndex) {
        const ANSWER_WIDTH = 4 + 30 + 4;  // margin + width + margin
        let xPos = ANSWER_WIDTH * visualIndex;
        if (this.waiting) {
          xPos += ANSWER_WIDTH;
        }
        const style = {};
        // translateZ(0) is there to try and force GPU-acceleration.
        // (see e.g. http://blog.teamtreehouse.com/increase-your-sites-performance-with-hardware-accelerated-css)
        style.transform = `translate(${xPos}px) translateZ(0)`;
        // hidden "slide-off" item
        if (visualIndex === this.numItemsToRender - 1) {
          style.opacity = 0;
        }
        return style;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  $size = 30px
  $margin = 4px

  .wrapper
    white-space: nowrap

  .answer
    width: $size
    height: 20px
    display: inline-block
    margin: $margin
    text-align: center
    position: absolute
    transition: transform 0.5s ease-in-out, opacity 1s ease-in-out

    // try to improve performance - http://stackoverflow.com/a/10133679
    backface-visibility: hidden
    perspective: 1000

  .fade-enter, .fade-leave
    opacity: 0

  .placeholder
    display: inline-block
    height: $size
    width: $size
    margin: $margin
    border-bottom: 1px solid $core-text-annotation
    transition: border-bottom 0.1s linear

  .placeholder-empty
    border-bottom: 3px solid $core-text-annotation

</style>
