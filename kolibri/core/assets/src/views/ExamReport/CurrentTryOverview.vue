<template>

  <table class="scores">
    <tr v-if="!hideStatus">
      <th>
        {{ coreString('statusLabel') }}
      </th>
      <td>
        <ProgressIcon class="svg-icon" :progress="progress" />
        {{ progressIconLabel }}
      </td>
    </tr>
    <tr v-if="masteryModel">
      <th>
        {{ coreString('masteryModelLabel') }}
      </th>
      <td>
        <MasteryModel :masteryModel="masteryModel" />
      </td>
    </tr>
    <tr v-if="correctDefined && !masteryModel">
      <th>
        {{ coreString('scoreLabel') }}
      </th>
      <td>
        {{ $formatNumber(score, { style: 'percent' }) }}
      </td>
    </tr>
    <tr v-if="correctDefined && !masteryModel">
      <th>
        {{ $tr('questionsCorrectLabel') }}
      </th>
      <td>
        {{ $tr('questionsCorrectValue', {
          correct: currentTry.correct, total: totalQuestions
        }) }}
        <br>
        <span
          v-if="questionsCorrectAnnotation"
          class="try-annotation"
          :style="{ color: $themeTokens.annotation }"
        >{{ questionsCorrectAnnotation }}</span>
      </td>
    </tr>
    <tr v-if="currentTry.time_spent">
      <th>
        {{ coreString('timeSpentLabel') }}
      </th>
      <td>
        <TimeDuration :seconds="currentTry.time_spent" />
        <br>
        <span
          v-if="timeSpentAnnotation"
          class="try-annotation"
          :style="{ color: $themeTokens.annotation }"
        >{{ timeSpentAnnotation }}</span>
      </td>
    </tr>
    <tr>
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

  import has from 'lodash/has';
  import isUndefined from 'lodash/isUndefined';
  import { mapGetters } from 'vuex';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import MasteryModel from 'kolibri.coreVue.components.MasteryModel';

  export default {
    name: 'CurrentTryOverview',
    components: {
      ElapsedTime,
      TimeDuration,
      ProgressIcon,
      MasteryModel,
    },
    mixins: [commonCoreStrings],
    props: {
      currentTry: {
        type: Object,
        required: true,
        validator(currentTry) {
          const requiredFields = ['correct', 'time_spent', 'completion_timestamp', 'complete'];
          if (!requiredFields.every(key => has(currentTry, key))) {
            return false;
          }
          if (!currentTry.diff || Object.keys(currentTry.diff).length === 0) {
            return true;
          }
          return has(currentTry.diff, 'correct') && has(currentTry.diff, 'time_spent');
        },
      },
      totalQuestions: {
        type: Number,
        required: true,
      },
      hideStatus: {
        type: Boolean,
        default: false,
      },
      userId: {
        type: String,
        default: '',
      },
    },
    computed: {
      ...mapGetters(['currentUserId']),
      progressIconLabel() {
        if (this.currentTry.complete) {
          return this.coreString('completedLabel');
        } else if (this.currentTry.complete !== null) {
          return this.$tr('inProgress');
        } else {
          return this.$tr('notStartedLabel');
        }
      },
      progress() {
        if (this.currentTry.complete) {
          return 1.0;
        } else if (this.currentTry.complete !== null) {
          return 0.5;
        } else {
          return 0.0;
        }
      },
      masteryModel() {
        if (
          this.currentTry.mastery_criterion &&
          this.currentTry.mastery_criterion.type !== 'quiz'
        ) {
          return this.currentTry.mastery_criterion;
        }
        return null;
      },
      correctDefined() {
        return !isUndefined(this.currentTry.correct);
      },
      score() {
        return this.currentTry.correct / this.totalQuestions;
      },
      questionsCorrectAnnotation() {
        if (!this.currentTry.diff || this.userId !== this.currentUserId) {
          return null;
        }

        return this.currentTry.diff.correct > 0
          ? this.$tr('practiceQuizReportImprovedLabelSecondPerson', {
              value: this.currentTry.diff.correct,
            })
          : null;
      },
      timeSpentAnnotation() {
        if (!this.currentTry.diff) {
          return null;
        }

        const fasterTime = this.currentTry.diff.time_spent
          ? Math.floor(this.currentTry.diff.time_spent / 60)
          : 0;

        if (fasterTime <= -1) {
          return this.$tr('practiceQuizReportFasterTimeLabel', { value: Math.abs(fasterTime) });
        } else if (fasterTime >= 1) {
          return this.$tr('practiceQuizReportSlowerTimeLabel', { value: fasterTime });
        }

        return null;
      },
    },
    $trs: {
      attemptedLabel: {
        message: 'Attempted',
        context: 'This verb will be used to indicate when a learner last attempted a quiz',
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
      inProgress: {
        message: 'In progress',
        context:
          "When a learner starts doing an exercise, viewing a video, or reading a document, this will be marked with the 'In progress' icon.\n\nThe text 'In progress' appears if the learner moves their mouse over the icon.",
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
