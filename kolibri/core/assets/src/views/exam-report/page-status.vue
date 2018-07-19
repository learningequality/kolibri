<template>

  <k-grid class="page-status">
    <k-grid-item size="75" percentage>
      <div class="user-name-container">
        <mat-svg
          class="svg-item"
          category="action"
          name="face"
        />
        <h1 class="user-name">{{ $tr('title', {name: userName}) }}</h1>
      </div>
      <div class="questions">
        {{ $tr('overallScore', {score: score}) }}
      </div>
      <div class="questions">
        {{ $tr('questionsCorrect', { correct: questionsCorrect, total: questions.length }) }}
      </div>
    </k-grid-item>
    <k-grid-item size="25" percentage align="right">
      <div>
        <progress-icon class="svg-icon" :progress="progress" />
        <strong>
          <template v-if="completed">{{ $tr('completed') }}</template>
          <template v-else-if="completed !== null">{{ $tr('inProgress') }}</template>
          <template v-else>{{ $tr('notStarted') }}</template>
        </strong>
      </div>
      <div v-if="completed">
        <elapsed-time :date="completionTimestamp" />
      </div>
    </k-grid-item>
  </k-grid>

</template>


<script>

  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';

  export default {
    name: 'pageStatus',
    $trs: {
      title: '{name} - Exam performance',
      overallScore: 'Overall score: { score, number, percent }',
      questionsCorrect: 'Questions correct: {correct, number} of {total, number}',
      completed: 'Completed',
      inProgress: 'In progress',
      notStarted: 'Not started',
    },
    components: {
      progressIcon,
      elapsedTime,
      kGrid,
      kGridItem,
    },
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .page-status {
    padding: 8px;
    background-color: $core-bg-light;
  }

  .user-name-container {
    display: block;
  }

  .svg-icon {
    margin-right: 8px;
    font-size: 1.3em;
  }

  .questions {
    margin-top: 10px;
  }

  .svg-item {
    display: inline-block;
    margin-right: 8px;
    vertical-align: middle;
  }

  .user-name {
    display: inline-block;
    margin: 0;
    vertical-align: middle;
  }

</style>
