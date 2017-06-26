<template>

  <div class="wrapper">
    <transition-group name="fade">
      <div
        class="answer"
        v-for="(item, index) in itemsToRender"
        :style="styleForIndex(index, item.originalIndex)"
        :key="item.originalIndex"
      >
        <answer-icon :answer="item.answer" :success="success"/>
      </div>
    </transition-group>
    <div
      class="placeholder"
      v-for="i in numSpaces"
      :class="{'placeholder-empty': i === 0 && waitingForAttempt}"
    ></div>
  </div>

</template>


<script>

  import answerIcon from './answer-icon';
  export default {
    props: {
      waitingForAttempt: {
        type: Boolean,
        required: true
      },
      success: {
        type: Boolean,
        required: true
      },
      numSpaces: {
        type: Number,
        required: true
      },
      log: {
        type: Array,
        validator(arr) {
          return arr.every(val => [
            'right',
            'wrong',
            'hint'
          ].includes(val));
        }
      }
    },
    components: { answerIcon },
    computed: {
      numItemsToRender() {
        if (this.waitingForAttempt) {
          return this.numSpaces;
        }
        return this.numSpaces + 1;
      },
      itemsToRender() {
        return this.log.map((answer, originalIndex) => ({
          answer,
          originalIndex
        })).slice(-1 * this.numItemsToRender).reverse();
      }
    },
    methods: {
      styleForIndex(visualIndex, originalIndex) {
        const ANSWER_WIDTH = 4 + 30 + 4;
        let xPos = ANSWER_WIDTH * (this.log.length - 1 - originalIndex);
        if (this.waitingForAttempt) {
          xPos += ANSWER_WIDTH;
        }
        const style = {};
        style.transform = `translate(${ xPos }px) translateZ(0)`;
        if (visualIndex === this.numItemsToRender - 1) {
          style.opacity = 0;
        }
        return style;
      }
    }
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

  .placeholder-empty
    border-bottom: 3px solid $core-text-annotation

</style>
