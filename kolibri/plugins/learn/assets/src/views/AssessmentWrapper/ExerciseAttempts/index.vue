<template>

  <div class="exercise-attempts">
    <div
      v-for="(item, index) in itemsToRender"
      :key="`attempt-${item.originalIndex}`"
      class="attempt"
      :style="styleForIndex(index, item.originalIndex)"
    >
      <transition name="fade">
        <AnswerIcon :answer="item.answer" />
      </transition>
    </div>
    <div
      v-for="i in numSpaces"
      :key="`placeholder-${i}`"
      class="placeholder"
      :style="{ borderBottom: `2px solid ${$themeTokens.annotation}` }"
    >
    </div>
  </div>

</template>


<script>

  import AnswerIcon from './AnswerIcon';

  export default {
    name: 'ExerciseAttempts',
    components: { AnswerIcon },
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
          return arr.every(val => ['right', 'wrong', 'hint', 'rectified'].includes(val));
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
        const style = {};
        const side = this.isRtl ? 'right' : 'left';
        style[side] = `${xPos}px`;
        // hidden "slide-off" item
        if (visualIndex === this.numItemsToRender - 1) {
          style.opacity = 0;
        }
        return style;
      },
    },
  };

</script>


<style lang="scss" scoped>

  $size: 30px;
  $margin: 4px;

  .exercise-attempts {
    position: relative;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
  }

  .attempt,
  .placeholder {
    display: inline-block;
    width: $size;
    height: $size;
    margin: $margin;
  }

  .attempt {
    position: absolute;
    text-align: center;
    transition: all 0.5s ease-in-out;
  }

  .placeholder {
    transition: border-bottom 0.1s linear;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s;
  }

</style>
