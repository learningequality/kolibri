<template>

  <ul class="history-list">
    <li
      v-for="(question, index) in questions"
      :key="index"
      :ref="`item-${index}`"
      class="list-item"
    >
      <button
        class="clickable"
        :class="{ 'current-question': questionNumber === index }"
        :disabled="questionNumber === index"
        @click="$emit('goToQuestion', index)"
      >
        <KIcon
          class="dot"
          icon="notStarted"
          :color="isAnswered(question) ? $themeTokens.progress : $themeTokens.textDisabled"
        />
        <div class="text">
          {{ questionText(index + 1) }}
        </div>
      </button>
    </li>
  </ul>

</template>


<script>

  function isAboveContainer(child, parent) {
    const childRect = child.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    // If the top of the child is less than the top of the parent,
    // it is partially hidden above the scroll view.
    return childRect.top < parentRect.top;
  }

  function isBelowContainer(child, parent) {
    const childRect = child.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    // If the bottom of the child is greater than the bottom of the parent,
    // it is partially hidden below the scroll view.
    return childRect.bottom > parentRect.bottom;
  }

  export default {
    name: 'AnswerHistory',
    props: {
      pastattempts: {
        type: Array,
        default: () => [],
      },
      questions: {
        type: Array,
        default: () => [],
      },
      questionNumber: {
        type: Number,
        required: true,
      },
      currentQuestionAnswered: {
        type: Boolean,
        required: true,
      },
      /**
       * Id of the scrollable parent element that contains the question list. This is needed to
       * compute if we need to use `scrollIntoView` to scroll a question into view when navigating
       * through the question history.
       */
      overflowableParentId: {
        type: String,
        required: true,
      },
    },
    watch: {
      questionNumber(index) {
        // If possible, scroll it into view
        const element = this.$refs[`item-${index}`][0];
        const overflowableParent = document.getElementById(this.overflowableParentId);
        if (element && element.scrollIntoView && overflowableParent) {
          const container = overflowableParent;
          if (isAboveContainer(element, container)) {
            element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
          } else if (isBelowContainer(element, container)) {
            element.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'smooth' });
          }
        }
      },
    },
    methods: {
      questionText(num) {
        return this.$tr('question', { num });
      },
      isAnswered(question) {
        if (question === this.questions[this.questionNumber] && this.currentQuestionAnswered) {
          return this.currentQuestionAnswered;
        }
        const attempt = this.pastattempts.find(attempt => attempt.item === question);
        return attempt && attempt.answer;
      },
    },
    $trs: {
      question: {
        message: 'Question { num, number, integer}',
        context:
          "In the report section, the 'Answer history' shows the learner if they have answered questions correctly or incorrectly.\n\nOnly translate 'Question'.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .history-list {
    max-height: inherit;
    padding-left: 0;
    margin: 0;
    margin-top: 16px;
    list-style-type: none;
  }

  .list-item {
    margin-bottom: 4px;
  }

  .clickable {
    @extend %md-decelerate-func;

    position: relative;
    display: block;
    width: 100%;
    text-align: left;
    user-select: none;
    background-color: var(--tokens-surface);
    border: 0;
    border-radius: 4px;
    outline-offset: -2px;
    transition: background-color $core-time;

    &:hover {
      background-color: var(--palette-grey-v200);
    }

    &.current-question {
      background-color: var(--palette-grey-v200);
    }
  }

  .dot {
    position: absolute;
    top: 18px;
    left: 16px;
  }

  .text {
    margin: 16px;
    margin-left: 48px;
  }

</style>
