<template>

  <KFixedGrid
    numCols="4"
    class="page-status"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <KFixedGridItem span="3">
      <div>
        <h1 class="title">
          <KLabeledIcon icon="person" :label="userName" />
        </h1>
        <KLabeledIcon icon="quiz" :label="contentName" />
      </div>

      <table class="scores">
        <tr>
          <th>
            {{ $tr('overallScore') }}
          </th>
          <td>
            <strong>
              {{ $formatNumber(score, { style: 'percent' }) }}
            </strong>
          </td>
        </tr>
        <tr>
          <th>
            {{ $tr('questionsCorrectLabel') }}
          </th>
          <td>
            {{ $tr('questionsCorrectValue', {
              correct: questionsCorrect, total: questions.length
            }) }}
          </td>
        </tr>
      </table>
    </KFixedGridItem>
    <KFixedGridItem span="1" alignment="right">
      <div>
        <ProgressIcon class="svg-icon" :progress="progress" />
        <strong>
          {{ progressIconLabel }}
        </strong>
      </div>
      <div v-if="completed">
        <ElapsedTime :date="completionTimestamp" />
      </div>
    </KFixedGridItem>
  </KFixedGrid>

</template>


<script>

  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'PageStatus',
    components: {
      ProgressIcon,
      ElapsedTime,
    },
    mixins: [commonCoreStrings],
    props: {
      userName: {
        type: String,
        required: true,
      },
      questions: {
        type: Array,
        default: () => [],
      },
      completed: {
        type: Boolean,
        default: false,
      },
      completionTimestamp: { type: Date },
      contentName: {
        type: String,
        required: true,
      },
    },
    computed: {
      questionsCorrect() {
        return this.questions.reduce((a, q) => a + (q.correct === 1 ? 1 : 0), 0);
      },
      score() {
        return this.questions.reduce((a, q) => a + q.correct, 0) / this.questions.length || 0;
      },
      progress() {
        // Either return in completed or in progress
        return this.completed ? 1 : 0.1;
      },
      progressIconLabel() {
        if (this.completed) {
          return this.coreString('completedLabel');
        } else if (this.completed !== null) {
          return this.$tr('inProgress');
        } else {
          return this.$tr('notStartedLabel');
        }
      },
    },
    $trs: {
      overallScore: 'Overall score',
      questionsCorrectLabel: 'Questions correct',
      questionsCorrectValue: '{correct, number} out of {total, number}',
      inProgress: 'In progress',
      notStartedLabel: 'Not started',
    },
  };

</script>


<style lang="scss" scoped>

  .page-status {
    padding: 8px;
  }

  .svg-icon {
    margin-right: 8px;
    font-size: 1.3em;
  }

  .icon {
    position: relative;
    top: -2px;
  }

  .questions {
    margin-top: 10px;
  }

  .svg-item {
    display: inline-block;
    margin-right: 8px;
    vertical-align: middle;
  }

  .title {
    margin-top: 0;
  }

  .scores {
    min-width: 200px;
    margin-top: 24px;

    th {
      text-align: left;
    }

    th,
    td {
      height: 2em;
      padding-right: 24px;
      font-size: 14px;
    }
  }

</style>
