<template>

  <!-- z-index 7 - one beneath top menu bar for nested elevations -->
  <BaseToolbar style="z-index: 7">
    <div
      class="container"
      :style="{ flexWrap: windowBreakpoint > 0 ? 'nowrap' : 'wrap' }"
    >
      <KTextTruncator
        class="requirements"
        :text="coreString('shortExerciseGoalDescription', { count: requiredCorrectAnswers })"
      />
      <span>
        <slot name="hint"></slot>
      </span>
    </div>
  </BaseToolbar>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BaseToolbar from 'kolibri-common/components/BaseToolbar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'LessonMasteryBar',
    components: {
      BaseToolbar,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
      };
    },
    props: {
      // typically this would be "m" from "m of n" mastery model
      requiredCorrectAnswers: {
        type: Number,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .container {
    display: flex;
    justify-content: space-between;
    padding-top: 16px;
    padding-bottom: 8px;
  }

  .requirements {
    min-width: 0; // allow text to be shrinked and truncated
    margin-right: 8px;
  }

</style>
