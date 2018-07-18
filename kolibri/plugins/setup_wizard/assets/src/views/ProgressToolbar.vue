<template>

  <ui-toolbar
    class="progress-toolbar"
    type="colored"
    textColor="white"
  >
    <ui-icon-button
      slot="icon"
      v-show="currentStep > 1"
      type="secondary"
      color="white"
      @click="$emit('backButtonClicked')"
      :class="{ 'rtl-icon': isRtl }"
    >
      <mat-svg name="arrow_back" category="navigation" />
    </ui-icon-button>
    {{ $tr('progressIndicator', {currentStep , totalSteps}) }}

  </ui-toolbar>

</template>


<script>

  import UiToolbar from 'keen-ui/src/UiToolbar';
  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'ProgressToolbar',
    components: {
      UiToolbar,
      UiIconButton,
    },
    $trs: {
      progressIndicator: 'Step {currentStep, number} of {totalSteps, number}',
    },
    props: {
      currentStep: {
        type: Number,
        required: true,
      },
      totalSteps: {
        type: Number,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .progress-toolbar {
    fill: white;
  }

</style>
