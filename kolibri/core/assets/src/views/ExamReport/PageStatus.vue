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
      <!-- only show the current try if the user has only one try -->
      <CurrentTryOverview
        :progress="progress"
        :questionsCorrect="questionsCorrect"
        :score="score"
        :totalQuestions="questions.length"
        :completionTimestamp="completionTimestamp"
        :completed="completed"
      />
    </KFixedGridItem>
    <KFixedGridItem span="1" alignment="right">
      <KButton v-if="retry" @click="$emit('repeat')">
        {{ coreString('practiceAgainButton') }}
      </KButton>
    </KFixedGridItem>
  </KFixedGrid>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CurrentTryOverview from './CurrentTryOverview';

  export default {
    name: 'PageStatus',
    components: {
      CurrentTryOverview,
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
      completionTimestamp: {
        type: Date,
        default: null,
      },
      contentName: {
        type: String,
        required: true,
      },
      retry: {
        type: Boolean,
        default: false,
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
    },
  };

</script>


<style lang="scss" scoped>

  .page-status {
    padding: 8px;
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

</style>
