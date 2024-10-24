<template>

  <table
    v-if="currentTryDefined"
    class="scores"
  >
    <tr
      v-if="!hideStatus"
      data-test="try-status"
    >
      <th>
        {{ coreString('statusLabel') }}
      </th>
      <td>
        <ProgressIcon
          class="svg-icon"
          :progress="progress"
        />
        {{ progressIconLabel }}
      </td>
    </tr>
    <tr
      v-if="masteryModel && !isSurvey"
      data-test="try-mastery-model"
    >
      <th>
        {{ coreString('masteryModelLabel') }}
      </th>
      <td>
        <MasteryModel :masteryModel="masteryModel" />
      </td>
    </tr>
    <tr
      v-if="!isSurvey && correctDefined && !masteryModel"
      data-test="try-score"
    >
      <th>
        {{ coreString('scoreLabel') }}
      </th>
      <td>
        {{ $formatNumber(score, { style: 'percent' }) }}
      </td>
    </tr>
    <tr
      v-if="!isSurvey && correctDefined && !masteryModel"
      data-test="try-questions-correct"
    >
      <th>
        {{ coreString('questionsCorrectLabel') }}
      </th>
      <td>
        {{
          coreString('questionsCorrectValue', {
            correct: currentTry.correct,
            total: totalQuestions,
          })
        }}
        <br >
        <span
          v-if="questionsCorrectAnnotation"
          class="try-annotation"
          :style="{ color: $themeTokens.annotation }"
        >{{ questionsCorrectAnnotation }}</span>
      </td>
    </tr>
    <tr
      v-if="!isSurvey && currentTry.time_spent"
      data-test="try-time-spent"
    >
      <th>
        {{ coreString('timeSpentLabel') }}
      </th>
      <td>
        <TimeDuration :seconds="currentTry.time_spent" />
        <br >
        <span
          v-if="timeSpentAnnotation"
          class="try-annotation"
          :style="{ color: $themeTokens.annotation }"
        >{{ timeSpentAnnotation }}</span>
      </td>
    </tr>
    <tr data-test="try-attempted-ago">
      <th>
        {{ $tr('attemptedLabel') }}
      </th>
      <td>
        <ElapsedTime
          :date="new Date(currentTry.completion_timestamp || currentTry.end_timestamp)"
        />
      </td>
    </tr>
  </table>

</template>


<script>

  import get from 'lodash/get';
  import isPlainObject from 'lodash/isPlainObject';
  import isUndefined from 'lodash/isUndefined';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import MasteryModel from 'kolibri-common/components/labels/MasteryModel';
  import useUser from 'kolibri/composables/useUser';
  import { tryValidator } from './utils';

  export default {
    name: 'CurrentTryOverview',
    components: {
      ElapsedTime,
      TimeDuration,
      ProgressIcon,
      MasteryModel,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { currentUserId } = useUser();
      return { currentUserId };
    },
    props: {
      // This should be an object with the following properties:
      // id: the unique id for the mastery log for this try
      // mastery_criterion: the mastery criterion
      // start_timestamp: the start time
      // end_timestamp: the last time this try was interacted with
      // completion_timestamp: the time when this try was completed
      // complete: whether this try is complete or not
      // correct: the number of correct responses in this try
      // time_spent: the total time spent on this try
      currentTry: {
        type: Object,
        required: true,
        validator: tryValidator,
      },
      // The total number of questions that this assessment has
      // used for calculating scores for quizzes
      totalQuestions: {
        type: Number,
        required: true,
      },
      // Whether to hide the current overall progress
      // used when using the CurrentTry component in the context
      // of multiple tries, where the overall progress is determined
      // from the most recent try.
      hideStatus: {
        type: Boolean,
        default: false,
      },
      // The id of the user - this is used to determine whether
      // to display second person or third person language,
      // by comparing the user id to the currently active user id.
      userId: {
        type: String,
        default: '',
      },
      // Whether the modality is a Survey - conditionalizes styles
      isSurvey: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      currentTryDefined() {
        return isPlainObject(this.currentTry);
      },
      progressIconLabel() {
        if (!this.currentTryDefined) {
          return '';
        }
        if (this.currentTry.complete) {
          return this.coreString('completedLabel');
        } else if (this.currentTry.complete !== null) {
          return this.coreString('inProgressLabel');
        } else {
          return this.$tr('notStartedLabel');
        }
      },
      progress() {
        if (!this.currentTryDefined) {
          return 0.0;
        }
        if (this.currentTry.complete) {
          return 1.0;
        } else if (this.currentTry.complete !== null) {
          return 0.5;
        }
        return 0.0;
      },
      masteryModel() {
        const masteryModel = get(this, 'currentTry.mastery_criterion.type', null);
        if (masteryModel && masteryModel !== 'quiz') {
          return this.currentTry.mastery_criterion;
        }
        return null;
      },
      correctDefined() {
        return this.currentTryDefined && !isUndefined(this.currentTry.correct);
      },
      score() {
        // Get will return 0 if currentTry.correct is undefined - we || to 0 also
        // in case the value is for some reason falsy;
        return get(this, 'currentTry.correct', 0) / this.totalQuestions || 0;
      },
      questionsCorrectAnnotation() {
        if (
          !this.currentTryDefined ||
          !this.currentTry.diff ||
          this.userId !== this.currentUserId
        ) {
          return null;
        }

        return this.currentTry.diff.correct > 0
          ? this.$tr('practiceQuizReportImprovedLabelSecondPerson', {
            value: this.currentTry.diff.correct,
          })
          : null;
      },
      diffTimeSpent() {
        return Math.floor(get(this, 'currentTry.diff.time_spent', 0) / 60) || null;
      },
      timeSpentAnnotation() {
        if (!this.currentTryDefined || !this.currentTry.diff) {
          return null;
        }

        if (this.diffTimeSpent <= -1) {
          return this.$tr('practiceQuizReportFasterTimeLabel', {
            value: Math.abs(this.diffTimeSpent),
          });
        } else if (this.diffTimeSpent >= 1) {
          return this.$tr('practiceQuizReportSlowerTimeLabel', { value: this.diffTimeSpent });
        }

        return null;
      },
    },
    $trs: {
      attemptedLabel: {
        message: 'Attempted',
        context: 'This verb will be used to indicate when a learner last attempted a quiz',
      },
      notStartedLabel: {
        message: 'Not started',
        context:
          "When a coach creates a quiz, by default it is marked as 'Not started'. This means that learners will not see it in the Learn > Classes view.\n\nThe coach needs to use the 'START QUIZ' button to enable learners to see the quiz and start answering the questions.",
      },
      practiceQuizReportFasterTimeLabel: {
        message:
          '{value, number, integer} {value, plural, one {minute} other {minutes}} faster than the previous attempt',
        context:
          'Indicates to the learner how much faster they were on this attempt compared to the previous one',
      },
      practiceQuizReportSlowerTimeLabel: {
        message:
          '{value, number, integer} {value, plural, one {minute} other {minutes}} slower than the previous attempt',
        context:
          'Indicates to the learner how much slower they were on this attempt compared to the previous one',
      },
      practiceQuizReportImprovedLabelSecondPerson: {
        message:
          'You improved at {value, number, integer} {value, plural, one {question} other {questions}}',
        context:
          'Indicates to the learner how many questions they answered correctly compared to the previous attempt',
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
