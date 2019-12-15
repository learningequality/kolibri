<template>

  <div>
    <ul class="history-list">
      <li
        v-for="(question, index) in questions"
        :key="index"
        class="list-item"
      >
        <button
          :class="$computedClass(liStyle(index))"
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
  </div>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'AnswerHistory',
    props: {
      questionNumber: {
        type: Number,
        required: true,
      },
    },
    computed: {
      ...mapState('examViewer', ['questions']),
      ...mapState({ attemptLogs: 'examAttemptLogs' }),
    },
    methods: {
      questionText(num) {
        return this.$tr('question', { num });
      },
      isAnswered(question) {
        return ((this.attemptLogs[question.exercise_id] || {})[question.question_id] || {}).answer;
      },
      liStyle(index) {
        if (this.questionNumber === index) {
          return {
            backgroundColor: this.$themePalette.grey.v_200,
          };
        }
        return {
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_100,
          },
        };
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
