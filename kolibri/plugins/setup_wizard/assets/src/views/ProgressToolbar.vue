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
      <KIcon
        icon="back"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </UiIconButton>
    {{ $tr('progressIndicator', { currentStep , totalSteps }) }}

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
    $trs: {
      progressIndicator: 'Step {currentStep, number} of {totalSteps, number}',
    },
  };

</script>


<style lang="scss" scoped>

  // TODO - refactor to use theme
  .progress-toolbar {
    fill: white;
  }

</style>
