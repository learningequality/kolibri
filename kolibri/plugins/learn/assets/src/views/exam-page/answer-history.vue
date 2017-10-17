<template>

  <div class="answer-history">
    <ul class="history-list">
      <template v-for="(question, index) in questions">
        <li @click="$emit('goToQuestion', index)" :class="isSelected(index)" class="clickable" :key="index">
          <svg class="item svg-item">
            <circle
              cx="32"
              cy="32"
              r="8"
              :style="{ fill: ((attemptLogs[question.contentId] || {})[question.itemId] || {}).answer ? 'purple' : 'lightgrey' }"
            />
          </svg>
          <p class="item">
            {{ questionText(index + 1) }}
          </p>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  export default {
    name: 'examAnswerHistory',
    $trs: {
      question: 'Question { num }',
    },
    props: {
      questionNumber: {
        type: Number,
        required: true,
      },
    },
    methods: {
      daysElapsedText(daysElapsed) {
        if (daysElapsed > 1) {
          return this.$tr('daysAgo', { daysElapsed });
        } else if (daysElapsed === 1) {
          return this.$tr('yesterday');
        }
        return this.$tr('today');
      },
      questionText(num) {
        return this.$tr('question', { num });
      },
      isSelected(index) {
        if (this.questionNumber === index) {
          return 'selected';
        }
        return null;
      },
    },
    vuex: {
      getters: {
        questions: state => state.pageState.questions,
        attemptLogs: state => state.examAttemptLogs,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .answer-history
    background-color: $core-bg-light

  .history-list
    list-style-type: none
    max-height: inherit
    margin: 0
    padding-left: 0

  .item
    float: left
    margin: 0
    line-height: 64px
    font-size: 0.9em

  .svg-item
    height: 64px
    width: 64px

  li
    clear: both
    border: none
    height: 64px

  .clickable
    cursor: pointer

  .selected
    background-color: $core-grey

</style>
