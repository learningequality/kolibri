<template>

  <KGrid class="page-status" :style="{ backgroundColor: $coreBgLight }">
    <KGridItem size="75" percentage>
      <div>
        <h1 class="title">{{ userName }}</h1>
        <p class="title">
          <ContentIcon
            class="icon"
            :kind="kind"
            :showTooltip="false"
          />
          {{ $tr('title', { name: contentName }) }}</p>
      </div>
      <div class="questions">
        {{ $tr('overallScore', {score: score}) }}
      </div>
      <div class="questions">
        {{ $tr('questionsCorrect', { correct: questionsCorrect, total: questions.length }) }}
      </div>
    </KGridItem>
    <KGridItem size="25" percentage align="right">
      <div>
        <ProgressIcon class="svg-icon" :progress="progress" />
        <strong>
          <template v-if="completed">{{ $tr('completed') }}</template>
          <template v-else-if="completed !== null">{{ $tr('inProgress') }}</template>
          <template v-else>{{ $tr('notStarted') }}</template>
        </strong>
      </div>
      <div v-if="completed">
        <ElapsedTime :date="completionTimestamp" />
      </div>
    </KGridItem>
  </KGrid>

</template>


<script>

  import { mapGetters } from 'vuex';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'PageStatus',
    $trs: {
      title: '{name} - Quiz performance',
      overallScore: 'Overall score: { score, number, percent }',
      questionsCorrect: 'Questions correct: {correct, number} of {total, number}',
      completed: 'Completed',
      inProgress: 'In progress',
      notStarted: 'Not started',
    },
    components: {
      KGrid,
      KGridItem,
      ProgressIcon,
      ElapsedTime,
      ContentIcon,
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
      contentName: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['$coreBgLight']),
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
      kind() {
        return ContentNodeKinds.EXAM;
      },
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
    margin: 0;
  }

</style>
