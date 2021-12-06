<template>

  <table class="scores">
    <tr>
      <th>
        {{ coreString('statusLabel') }}
      </th>
      <td>
        <ProgressIcon class="svg-icon" :progress="progress" />
        <template v-if="complete">
          {{ coreString('completedLabel') }}
        </template>
        <template v-else-if="progress">
          {{ coreString('inProgressLabel') }}
        </template>
        <template v-else>
          {{ coreString('notStartedLabel') }}
        </template>
      </td>
    </tr>
    <tr>
      <th>
        {{ $tr('bestScoreLabel') }}
      </th>
      <td>
        {{ $formatNumber(bestScore, { style: 'percent' }) }}
      </td>
    </tr>
    <tr>
      <th>
        {{ $tr('questionsCorrectLabel') }}
      </th>
      <td>
        {{ $tr('questionsCorrectValue', {
          correct: maxQuestionsCorrect, total: totalQuestions
        }) }}
      </td>
    </tr>
    <tr>
      <th>
        {{ $tr('bestScoreTimeLabel') }}
      </th>
      <td>
        <TimeDuration :seconds="bestTimeSpent" />
        <br>
        <span
          v-if="suggestedTimeAnnotation"
          class="try-annotation"
          :style="{ color: $themeTokens.annotation }"
        >{{ suggestedTimeAnnotation }}</span>
      </td>
    </tr>
  </table>

</template>


<script>

  import has from 'lodash/has';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';

  export default {
    name: 'TriesOverview',
    components: {
      TimeDuration,
      ProgressIcon,
    },
    mixins: [commonCoreStrings],
    props: {
      pastTries: {
        type: Array,
        required: true,
        validator(pastTries) {
          const requiredFields = ['time_spent', 'correct'];
          return pastTries.every(tryData => requiredFields.every(field => has(tryData, field)));
        },
      },
      totalQuestions: {
        type: Number,
        required: true,
      },
      suggestedTime: {
        type: Number,
        default: null,
      },
    },
    computed: {
      complete() {
        return this.pastTries.some(tryInfo => tryInfo.completion_timestamp);
      },
      progress() {
        if (this.complete) {
          return 1.0;
        } else if (this.pastTries.length) {
          return 0.5;
        } else {
          return 0.0;
        }
      },
      bestTimeSpent() {
        return Math.min(...this.pastTries.map(t => t.time_spent));
      },
      maxQuestionsCorrect() {
        return Math.max(...this.pastTries.map(t => t.correct));
      },
      bestScore() {
        return this.maxQuestionsCorrect / this.totalQuestions || 0;
      },
      suggestedTimeAnnotation() {
        if (!this.suggestedTime) {
          return null;
        }

        const diff = Math.floor((this.bestTimeSpent - this.suggestedTime) / 60);
        if (!diff) {
          return null;
        }

        return diff >= 1
          ? this.$tr('practiceQuizReportSlowerSuggestedLabel', { value: diff })
          : this.$tr('practiceQuizReportFasterSuggestedLabel', { value: Math.abs(diff) });
      },
    },
    $trs: {
      bestScoreLabel: {
        message: 'Best score',
        context:
          'When there have been multiple attempts on a practice quiz, indicates to learner the percentage of their highest score',
      },
      bestScoreTimeLabel: {
        message: 'Best score time',
        context:
          'When there have been multiple attempts on a practice quiz, it indicates to the learner how long the attempt with the best score has taken',
      },
      questionsCorrectLabel: {
        message: 'Questions answered correctly',
        context:
          "In a report, learners can see how many questions they have got correct in a quiz.\n\nThe 'Questions answered correctly' label will indicate something like 4 out of 5, or 8 out of 10, for example.",
      },
      questionsCorrectValue: {
        message: '{correct, number} out of {total, number}',
        context:
          "When a learner views their report they can see how many questions they answered correctly in a quiz.\n\nThe 'Questions correct' label will indicate something like 4 out of 5, or 8 out of 10, for example. That's to say, the number of correct answers as well as the total number of questions.",
      },
      practiceQuizReportFasterSuggestedLabel: {
        message:
          '{value, number, integer} {value, plural, one {minute} other {minutes}} faster than the suggested time',
        context:
          'Indicates to the learner how many minutes faster they were than the suggested time',
      },
      practiceQuizReportSlowerSuggestedLabel: {
        message:
          '{value, number, integer} {value, plural, one {minute} other {minutes}} slower than the suggested time',
        context:
          'Indicates to the learner how many minutes slower they were than the suggested time',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .scores {
    min-width: 200px;
    margin-top: 24px;

    th {
      max-width: 190px;
      text-align: left;
    }

    th,
    td {
      height: 2em;
      padding-top: 16px;
      padding-right: 24px;
      font-size: 14px;
    }
  }

  .svg-icon {
    right: 0;
    /deep/ .icon {
      max-width: 16px !important;
      max-height: 16px !important;
    }
  }

  .try-annotation {
    font-size: 0.9em;
  }

</style>
