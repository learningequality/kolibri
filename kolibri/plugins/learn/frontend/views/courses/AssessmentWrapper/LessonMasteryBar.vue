<template>

  <div>
    <div
      class="container"
      :style="{ flexWrap: windowBreakpoint > 0 ? 'nowrap' : 'wrap' }"
    >
      <strong>
        <KTextTruncator
          class="requirements"
          :text="coreString('shortExerciseGoalDescription', { count: requiredCorrectAnswers })"
        />
      </strong>
      <span>
        <slot name="hint"></slot>
      </span>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'LessonMasteryBar',
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
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    min-height: 2.5rem;
    padding: 8px 24px;

    strong {
      font-weight: 600;
    }
  }

  .requirements {
    min-width: 0; // allow text to be shrinked and truncated
    margin-right: 8px;
  }

</style>
