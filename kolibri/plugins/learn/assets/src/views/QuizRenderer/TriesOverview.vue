<template>

  <table class="scores">
    <tr>
      <th>
        {{ coreString('statusLabel') }}
      </th>
      <td>
        <ProgressIcon class="svg-icon" :progress="progress" />
        {{ coreString('completedLabel') }}
      </td>
    </tr>
    <tr>
      <th>
        {{ coreString('bestScoreLabel') }}
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
        {{ coreString('bestScoreTimeLabel') }}
      </th>
      <td>
        <TimeDuration :seconds="bestTimeSpent" />
      </td>
    </tr>
  </table>

</template>


<script>

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
      progress: {
        type: Number,
        required: false,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
      },
      bestScore: {
        type: Number,
        required: true,
      },
      maxQuestionsCorrect: {
        type: Number,
        required: true,
      },
      totalQuestions: {
        type: Number,
        required: true,
      },
      bestTimeSpent: {
        type: Number,
        required: true,
      },
    },
    $trs: {
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

</style>
