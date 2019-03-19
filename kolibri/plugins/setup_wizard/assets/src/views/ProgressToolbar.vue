<template>

  <UiToolbar
    class="progress-toolbar"
    type="clear"
    textColor="white"
    :removeNavIcon="!displayNavIcon"
  >
    <UiIconButton
      slot="icon"
      type="secondary"
      color="white"
      :class="{ 'rtl-icon': isRtl }"
      @click="$emit('backButtonClicked')"
    >
      <mat-svg name="arrow_back" category="navigation" />
    </UiIconButton>
    {{ $tr('progressIndicator', {currentStep , totalSteps}) }}

  </UiToolbar>

</template>


<script>

  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

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
    computed: {
      displayNavIcon() {
        return this.currentStep > 1;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-toolbar {
    fill: white;
  }

</style>
