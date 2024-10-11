<template>

  <span :class="{ 'no-diff': !showDiff }">
    <component
      :is="displayTag"
      class="item"
    >
      {{ coreString('questionNumberLabel', { questionNumber: questionNumber }) }}
    </component>
    <template v-if="!isSurvey">
      <AttemptIconDiff
        v-if="showDiff"
        class="diff-item item"
        data-test="question-attempt-icons"
        :correct="attemptLog.correct"
        :diff="attemptLog.diff.correct"
      />
      <KIcon
        v-if="attemptLog.noattempt"
        class="item svg-item"
        data-test="question-attempt-icons"
        icon="notStarted"
      />
      <KIcon
        v-else-if="attemptLog.correct"
        class="item svg-item"
        data-test="question-attempt-icons"
        :style="{ fill: $themeTokens.correct }"
        icon="correct"
      />
      <KIcon
        v-else-if="attemptLog.error"
        class="svg-item"
        data-test="question-attempt-icons"
        :style="{ fill: $themeTokens.annotation }"
        icon="helpNeeded"
      />
      <KIcon
        v-else-if="!attemptLog.correct"
        class="item svg-item"
        data-test="question-attempt-icons"
        :style="{ fill: $themeTokens.incorrect }"
        icon="incorrect"
      />
      <KIcon
        v-else-if="attemptLog.hinted"
        class="item svg-item"
        data-test="question-attempt-icons"
        :style="{ fill: $themeTokens.annotation }"
        icon="hint"
      />
    </template>
    <CoachContentLabel
      class="coach-content-label"
      :value="attemptLog.num_coach_contents || 0"
      :isTopic="false"
    />
    <KIcon
      v-if="attemptLog.missing_resource"
      class="coach-content-label"
      icon="warning"
      :color="$themePalette.yellow.v_600"
    />
  </span>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import AttemptIconDiff from './AttemptIconDiff';

  export default {
    name: 'AttemptLogItem',
    components: {
      CoachContentLabel,
      AttemptIconDiff,
    },
    mixins: [commonCoreStrings],
    props: {
      attemptLog: {
        type: Object,
        required: true,
      },
      displayTag: {
        type: String,
        required: true,
      },
      isSurvey: {
        type: Boolean,
        required: true,
      },
      questionNumber: {
        type: Number,
        required: true,
      },
    },
    computed: {
      showDiff() {
        return this.attemptLog.correct && this.attemptLog.diff && this.attemptLog.diff.correct >= 1;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-content-label {
    display: inline-block;
    max-width: 0.5vw; // keeps on same line as question
    margin-top: -4px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .item {
    display: inline-block;
    height: 100%;
    margin-right: 8px;
  }

  .diff-item {
    margin: 0 0 -4px;
    font-size: 16px;
  }

  .svg-item {
    margin: 0 0 -4px;
    font-size: 24px;
  }

  .no-diff {
    .svg-item {
      // Add margin left equivalent to diff icon
      margin-left: 18px;
    }
  }

</style>
