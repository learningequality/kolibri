<template>

  <div
    v-if="progress"
    class="progress-bar-wrapper"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="progress * 100"
  >
    <p
      v-if="completed || isQuiz"
      class="completion-label"
      :style="{ color: $themePalette.grey.v_800 }"
    >
      <ProgressIcon
        :progress="progress"
        class="completion-icon"
      />
      <template v-if="isQuiz">
        {{ completed ? quizCompletedLabel : quizInProgressLabel }}
      </template>
      <template v-else>
        {{ coreString('completedLabel') }}
      </template>
    </p>
    <KLinearLoader
      v-if="!isQuiz && progress && !completed"
      class="k-linear-loader"
      :delay="false"
      :progress="progress * 100"
      type="determinate"
      :style="{ backgroundColor: $themeTokens.fineLine }"
    />
  </div>

</template>


<script>

  import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import lodashGet from 'lodash/get';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import { learnStrings } from './commonLearnStrings';
  /**
   * A progress bar that has three states:
   * - won't display when not started (progress = 0)
   * - blue bar when in progress (0 < progress < 1)
   * - Completed icon with text when complete
   */
  export default {
    name: 'ProgressBar',
    components: {
      ProgressIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { contentNodeProgressMap, contentNodeProgressMetaDataMap } = useContentNodeProgress();
      const { questionsLeft$, completedPercentLabel$ } = learnStrings;
      return {
        contentNodeProgressMap,
        contentNodeProgressMetaDataMap,
        questionsLeft$,
        completedPercentLabel$,
      };
    },
    props: {
      // eslint-disable-next-line vue/no-unused-properties
      contentNode: {
        type: Object,
        required: true,
      },
    },
    computed: {
      isQuiz() {
        return lodashGet(this.contentNode, ['options', 'modality'], false) === 'QUIZ';
      },
      progress() {
        return this.contentNodeProgressMap[this.contentNode && this.contentNode.content_id] || 0;
      },
      completed() {
        return this.progress >= 1;
      },
      quizProgress() {
        return (
          this.contentNodeProgressMetaDataMap[this.contentNode && this.contentNode.content_id] || {}
        );
      },
      remainingQuestions() {
        if (this.isQuiz && this.quizProgress.total_questions) {
          return this.quizProgress.total_questions - this.quizProgress.num_question_answered;
        }
        return 0;
      },
      score() {
        if (this.isQuiz && this.quizProgress.total_questions) {
          return (
            this.quizProgress.num_question_answered_correctly / this.quizProgress.total_questions
          );
        }
        return 0;
      },
      quizInProgressLabel() {
        if (this.isQuiz) {
          return this.questionsLeft$({ questionsLeft: this.remainingQuestions });
        }
        return '';
      },
      quizCompletedLabel() {
        if (this.isQuiz && this.completed) {
          const percentage = Math.round(100 * this.score);
          return this.completedPercentLabel$({ score: percentage });
        }
        return '';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-bar-wrapper {
    display: inline-block;
    width: 100%;
    opacity: 0.9;
  }

  .k-linear-loader {
    top: -8px;
    display: block;
    margin-bottom: 0;
  }

  .completion-icon {
    /deep/ svg {
      max-width: 14px;
      max-height: 14px;
    }
  }

  .completion-label {
    margin: 0;
    font-size: 13px;
  }

</style>
