<template>

  <div>
    <div
      class="hint-btn-container"
    >
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


    <div v-if="hinted" id="hintlabel" :dir="contentDirection">
      {{ $tr("hintLabel") }}
    </div>
    <div id="hintsarea" :dir="contentDirection" style="margin-left: 0px"></div>

    <div style="clear: both;"></div>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'Hint',
    mixins: [responsiveWindowMixin],
    props: {},
    data() {
      return {};
    },
    computed: {},
    watch: {},

    methods: {},
    /** https://github.com/learningequality/kolibri-exercise-perseus-plugin/blob/develop/
     * kolibri_exercise_perseus_plugin/assets/src/views/PerseusRendererIndex.vue
     */
    $trs: {
      hint: 'Use a hint ({hintsLeft, number} left)',
      hintExplanation: 'If you use a hint, this question will not be added to your progress',
      hintLabel: 'Hint:',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .hint-btn-container {
    text-align: right;
  }
  .hint-btn {
    vertical-align: text-bottom;
    border: 2px solid red;
  }

</style>
