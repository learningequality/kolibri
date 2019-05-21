<template>

  <div :style="{ backgroundColor: $themeColors.white }">
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

  import { mapState } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'AnswerHistory',
    mixins: [themeMixin],
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
    },
    $trs: {
      question: 'Question { num }',
    },
  };

</script>


<style lang="scss" scoped>

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
