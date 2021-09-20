<template>

  <div class="hint-btn-container">
    <KButton
      class="hint-btn"
      appearance="basic-link"
      :text="$tr('hint', { hintsLeft: availableHints })"
      :primary="false"
      @click="takeHint"
    />
    <CoreInfoIcon
      class="info-icon"
      tooltipPosition="bottom right"
      :iconAriaLabel="$tr('hintExplanation')"
      :tooltipText="$tr('hintExplanation')"
    />
  </div>

</template>


<script>

  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';

  export default {
    name: 'Hint',
    components: {
      CoreInfoIcon,
    },
    /** https://github.com/learningequality/kolibri-exercise-perseus-plugin/blob/develop/
     * kolibri_exercise_perseus_plugin/assets/src/views/PerseusRendererIndex.vue
     */
    $trs: {
      hint: 'Use a hint ({hintsLeft, number} left)',
      hintExplanation: 'If you use a hint, this question will not be added to your progress',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .hint-btn-container {
    margin-top: 4px; // to align with OverallStatus text
    text-align: right;
  }
  .hint-btn {
    position: relative;
    vertical-align: text-bottom;
  }
  .info-icon {
    margin-left: 8px;
  }

</style>
