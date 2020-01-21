<template>

  <ul class="history-list">
    <li
      v-for="(question, index) in questions"
      :key="index"
      :ref="`item-${index}`"
      class="list-item"
    >
      <button
        :class="buttonClass(index)"
        :disabled="questionNumber === index"
        class="clickable"
        @click="$emit('goToQuestion', index)"
      >
        <KIcon
          class="dot"
          icon="dot"
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

  import { mapState } from 'vuex';

  function isAboveContainer(element, container) {
    return element.offsetTop < container.scrollTop;
  }

  function isBelowContainer(element, container) {
    return element.offsetTop + element.offsetHeight > container.offsetHeight + container.scrollTop;
  }

  export default {
    name: 'AnswerHistory',
    props: {
      questionNumber: {
        type: Number,
        required: true,
      },
      // hack to get access to the scrolling pane
      wrapperComponentRefs: {
        type: Object,
        required: true,
      },
    },
    computed: {
      ...mapState('examViewer', ['questions']),
      ...mapState({ attemptLogs: 'examAttemptLogs' }),
    },
    watch: {
      questionNumber(index) {
        // If possible, scroll it into view
        const element = this.$refs[`item-${index}`][0];
        if (element && element.scrollIntoView && this.wrapperComponentRefs.questionListWrapper) {
          const container = this.wrapperComponentRefs.questionListWrapper.$el;
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
        return ((this.attemptLogs[question.exercise_id] || {})[question.question_id] || {}).answer;
      },
      buttonClass(index) {
        if (this.questionNumber === index) {
          return this.$computedClass({ backgroundColor: this.$themePalette.grey.v_200 });
        }
        return this.$computedClass({
          backgroundColor: this.$themeTokens.surface,
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_100,
          },
        });
      },
    },
    $trs: {
      question: 'Question { num }',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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
    border: 0;
    border-radius: 4px;
    outline-offset: -2px;
    transition: background-color $core-time;
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
