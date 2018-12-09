<template>

  <div :style="{ backgroundColor: $coreBgLight }">
    <ul class="history-list">
      <template v-for="(question, index) in questions">
        <li
          :key="index"
          :style="{ backgroundColor: questionNumber === index ? $coreGrey : '' }"
          class="clickable"
          @click="$emit('goToQuestion', index)"
        >
          <svg class="item svg-item">
            <circle
              cx="32"
              cy="32"
              r="8"
              :style="{ fill: isAnswered(question) ? 'purple' : 'lightgrey' }"
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

  import { mapGetters, mapState } from 'vuex';

  export default {
    name: 'AnswerHistory',
    $trs: {
      question: 'Question { num }',
    },
    props: {
      questionNumber: {
        type: Number,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['$coreGrey', '$coreBgLight']),
      ...mapState('examViewer', ['questions']),
      ...mapState({ attemptLogs: 'examAttemptLogs' }),
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
      isAnswered(question) {
        return ((this.attemptLogs[question.contentId] || {})[question.itemId] || {}).answer;
      },
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

  .item {
    float: left;
    margin: 0;
    font-size: 0.9em;
    line-height: 64px;
  }

  .svg-item {
    width: 64px;
    height: 64px;
  }

  li {
    height: 64px;
    clear: both;
    border: 0;
  }

  .clickable {
    cursor: pointer;
  }

</style>
