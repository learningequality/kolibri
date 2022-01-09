<template>

  <span>
    <KIcon
      v-if="attemptLog.noattempt"
      class="item svg-item"
      icon="notStarted"
    />
    <KIcon
      v-else-if="attemptLog.correct"
      class="item svg-item"
      :style="{ fill: $themeTokens.correct }"
      icon="correct"
    />
    <KIcon
      v-else-if="attemptLog.error"
      class="svg-item"
      :style=" { fill: $themeTokens.annotation }"
      icon="helpNeeded"
    />
    <KIcon
      v-else-if="!attemptLog.correct"
      class="item svg-item"
      :style="{ fill: $themeTokens.incorrect }"
      icon="incorrect"
    />
    <KIcon
      v-else-if="attemptLog.hinted"
      class="item svg-item"
      :style=" { fill: $themeTokens.annotation }"
      icon="hint"
    />
    <component :is="displayTag" class="item">
      {{ coreString(
        'questionNumberLabel',
        { questionNumber: attemptLog.questionNumber }
      )
      }}
    </component>
    <CoachContentLabel
      class="coach-content-label"
      :value="attemptLog.num_coach_contents || 0"
      :isTopic="false"
    />
  </span>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';

  export default {
    name: 'AttemptLogItem',
    components: {
      CoachContentLabel,
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
  }

  .svg-item {
    margin-right: 12px;
    margin-bottom: -4px;
    font-size: 24px;
  }

</style>
