<template>

  <div class="wrapper">
    <div
      class="answer"
      v-for="(item, index) in itemsToRender"
      :style="styleForIndex(index, item.originalIndex)"
      :key="item.originalIndex"
    >
      <transition name="fade">
        <answer-icon :answer="item.answer" />
      </transition>
    </div>
    <div
      class="placeholder"
      v-for="i in numSpaces"
      :class="{ 'placeholder-first': i === 1 }"
      :key="i"
    ></div>
  </div>

</template>


<script>

  import answerIcon from './answer-icon';
  export default {
    components: { answerIcon },
    props: {
      // Creates an empty space awaiting a new attempt
      waitingForAttempt: {
        type: Boolean,
        required: true,
      },
      // Total number of answer spaces to show
      numSpaces: {
        type: Number,
        required: true,
      },
      // Array of answers - strings that are 'right', 'wrong', or 'hint'
      // ordered from first to last
      log: {
        type: Array,
        validator(arr) {
          return arr.every(val => ['right', 'wrong', 'hint'].includes(val));
        },
      },
    },
    computed: {
      numItemsToRender() {
        if (this.waitingForAttempt) {
          return this.numSpaces;
        }
        return this.numSpaces + 1;
      },
      // returns a list of items the items to be rendered in the DOM
      itemsToRender() {
        // save the original index of the item in the log and slice of the end
        return this.log
          .map((answer, originalIndex) => ({
            answer,
            originalIndex,
          }))
          .slice(-1 * this.numItemsToRender)
          .reverse();
      },
    },
    methods: {
      styleForIndex(visualIndex, originalIndex) {
        const ANSWER_WIDTH = 4 + 30 + 4;
        let xPos = ANSWER_WIDTH * (this.log.length - 1 - originalIndex);
        if (this.waitingForAttempt) {
          xPos += ANSWER_WIDTH;
        }
        if (this.isRtl) {
          xPos *= -1;
        }
        const style = {};
        // translateZ(0) is there to try and force GPU-acceleration.
        // (see e.g. http://blog.teamtreehouse.com/increase-your-sites-performance-with-hardware-accelerated-css)
        style.transform = `translateX(${xPos}px) translateZ(0)`;
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

  @require '~kolibri.styles.definitions'

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
    transition: all 0.5s ease-in-out

    // try to improve performance - http://stackoverflow.com/a/10133679
    backface-visibility: hidden
    perspective: 1000

  .fade-enter, .fade-leave-active
    opacity: 0

  .placeholder
    display: inline-block
    height: $size
    width: $size
    margin: $margin
    border-bottom: 1px solid $core-text-annotation
    transition: border-bottom 0.1s linear

  .placeholder-first
    border-bottom: 3px solid $core-text-annotation

</style>
