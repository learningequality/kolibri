<template>

  <table class="scores">
    <tr>
      <th>
        {{ coreString('statusLabel') }}
      </th>
      <td>
        <ProgressIcon
          class="svg-icon"
          :progress="progress"
          :data-testid="`progress-icon-${progress}`"
        />
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
        {{ coreString('questionsCorrectLabel') }}
      </th>
      <td>
        {{
          coreString('questionsCorrectValue', {
            correct: maxQuestionsCorrect,
            total: totalQuestions,
          })
        }}
      </td>
    </tr>
    <tr v-if="bestTimeSpent !== null">
      <th>
        {{ $tr('bestScoreTimeLabel') }}
      </th>
      <td>
        <TimeDuration :seconds="bestTimeSpent" />
        <br >
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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import { tryValidator } from './utils';

  export default {
    name: 'TriesOverview',
    components: {
      TimeDuration,
      ProgressIcon,
    },
    mixins: [commonCoreStrings],
    props: {
      // This should be an array of objects with the following properties:
      // id: the unique id for the mastery log for this try
      // mastery_criterion: the mastery criterion
      // start_timestamp: the start time
      // end_timestamp: the last time this try was interacted with
      // completion_timestamp: the time when this try was completed
      // complete: whether this try is complete or not
      // correct: the number of correct responses in this try
      // time_spent: the total time spent on this try
      pastTries: {
        type: Array,
        required: true,
        validator(pastTries) {
          return pastTries.every(tryValidator);
        },
      },
      // The total number of questions that this assessment has
      // used for calculating scores for quizzes
      totalQuestions: {
        type: Number,
        required: true,
      },
      // The suggested time that a user should take to complete this assessment
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
      // Returns the time spent on the best attempt or null if there are no attempts
      bestTimeSpent() {
        const bestScoreAttempt = this.pastTries.find(t => t.correct === this.maxQuestionsCorrect);
        if (!bestScoreAttempt) {
          return null;
        }
        return bestScoreAttempt.time_spent;
      },
      // Returns the number of questions correct in the best attempt or 0 if there are no attempts
      maxQuestionsCorrect() {
        return this.pastTries.length ? Math.max(...this.pastTries.map(t => t.correct)) : 0;
      },
      bestScore() {
        return this.maxQuestionsCorrect / this.totalQuestions;
      },
      suggestedTimeAnnotation() {
        if (!this.suggestedTime || !this.bestTimeSpent) {
          return null;
        }

        const diff = Math.floor((this.bestTimeSpent - this.suggestedTime) / 60);

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
